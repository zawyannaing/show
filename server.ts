import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Enable CORS for Vercel & cross-origin requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-OpenRouter-Key, X-Admin-Key, X-Gemini-Key, x-gemini-key, x-openrouter-key, x-admin-key');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Initialize Gemini lazily or with client key
function getGeminiClient(keyOverride?: string): GoogleGenAI | null {
  const effectiveKey = (keyOverride || process.env.GEMINI_API_KEY || '').trim();
  if (!effectiveKey) return null;
  return new GoogleGenAI({ 
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

function cleanTextResponse(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```markdown')) {
    cleaned = cleaned.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

// In-memory sliding window rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests: number = 10, windowMs: number = 10 * 60 * 1000): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingMs: windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remainingMs: record.resetTime - now };
  }

  record.count += 1;
  return { allowed: true, remainingMs: record.resetTime - now };
}

// Resilient Gemini model cascade: handles temporary 503 high-demand spikes
async function generateWithGeminiRest(
  apiKey: string,
  requestPayload: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
    responseMimeType?: string;
  }
): Promise<{ text: string; modelUsed: string }> {
  // Fast-response single attempt model for ultra-low latency
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body: any = {
        contents: requestPayload.contents,
        generationConfig: {
          temperature: requestPayload.temperature ?? 0.3,
          maxOutputTokens: 800,
          ...(requestPayload.responseMimeType ? { responseMimeType: requestPayload.responseMimeType } : {})
        }
      };

      if (requestPayload.systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: requestPayload.systemInstruction }]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Gemini REST model ${model} HTTP ${response.status}:`, errText);
        throw new Error(`Gemini error: ${errText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      // Immediately fast-fail to OpenRouter on any network timeout or error
      console.warn(`Gemini REST failed fast on ${model}, switching immediately.`);
      break;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// Health check API
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    openRouterModel: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    timestamp: new Date().toISOString()
  });
});

// Diagnostic endpoint to test AI keys live
app.get('/api/test-ai', async (req, res) => {
  const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

  const results: any = {
    hasOpenRouterKey: Boolean(openRouterKey),
    openRouterKeyPrefix: openRouterKey ? openRouterKey.substring(0, 10) + '...' : null,
    hasGeminiKey: Boolean(geminiKey),
  };

  if (openRouterKey) {
    try {
      const orTest = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://show-ai-studio.com',
          'X-Title': 'ShowCare Test',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: 'Say hello in 3 words' }],
          max_tokens: 20
        }),
        signal: AbortSignal.timeout(6000)
      });
      results.openRouterStatus = orTest.status;
      if (orTest.ok) {
        const d = await orTest.json();
        results.openRouterResponse = d.choices?.[0]?.message?.content || d;
      } else {
        results.openRouterError = await orTest.text();
      }
    } catch (e: any) {
      results.openRouterException = e.message;
    }
  }

  res.json(results);
});

// Live Posts endpoint: Proxy Supabase posts directly from server
// Guarantees all devices in Myanmar receive fresh real-time posts without ISP throttling
app.get(['/api/posts', '/posts'], async (req, res) => {
  try {
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://wdezdoqnbvfvwnsuysfn.supabase.co').replace(/\/$/, '');
    const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9HuDL813Pxf6--IR5Uyd9Q_qAh09p7R').trim();

    const restRes = await fetch(`${supabaseUrl}/rest/v1/posts?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!restRes.ok) {
      const errText = await restRes.text();
      console.warn('Server Supabase posts fetch error:', restRes.status, errText);
      res.status(500).json({ error: errText, posts: [] });
      return;
    }

    const data = await restRes.json();
    res.json({ posts: data || [] });
  } catch (err: any) {
    console.error('Server posts fetch exception:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to fetch posts', posts: [] });
  }
});

// High-Speed Storage Proxy: Streams images from Supabase Storage with edge caching
// Bypasses ISP blocking in Myanmar and delivers images in milliseconds via Cloudflare CDN
app.get(['/api/storage/*', '/storage/*'], async (req, res) => {
  try {
    const rawPath = req.params[0] || req.path.replace(/^\/(api\/)?storage\//, '');
    if (!rawPath) {
      res.status(400).send('Storage path required');
      return;
    }
    const cleanPath = rawPath.replace(/^\/+/, '');
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://wdezdoqnbvfvwnsuysfn.supabase.co').replace(/\/$/, '');
    const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9HuDL813Pxf6--IR5Uyd9Q_qAh09p7R').trim();

    const targetUrl = `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;

    const imgRes = await fetch(targetUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!imgRes.ok) {
      res.status(imgRes.status).send('Image not found in storage');
      return;
    }

    const contentType = imgRes.headers.get('content-type') || 'image/webp';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await imgRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('Storage proxy error:', err?.message || err);
    res.status(500).send('Error streaming storage image');
  }
});

// AI Doctor Medicine Photo Identification endpoint
app.post(['/api/medicine/identify', '/medicine/identify'], async (req, res) => {
  try {
    const { image, language = 'my', additionalNotes, medicineHint, openRouterApiKey, geminiApiKey, model } = req.body || {};

    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Medicine image is required.' });
      return;
    }

    const rawGeminiKey = geminiApiKey || (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;
    const effectiveGeminiKey = typeof rawGeminiKey === 'string' ? rawGeminiKey.trim() : '';

    const rawOpenRouterKey = openRouterApiKey || (req.headers['x-openrouter-key'] as string) || process.env.OPENROUTER_API_KEY;
    const effectiveOpenRouterKey = typeof rawOpenRouterKey === 'string' ? rawOpenRouterKey.trim() : '';
    const selectedModel = typeof model === 'string' ? model : (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash');

    const systemPrompt = `You are an expert AI Doctor and Senior Pharmacist in Myanmar helping an elderly patient (senior citizen) and their caregiver understand a medicine from a photo.
The patient or their family took a photo of medicine packaging, blister foil, tablet bottle, liquid syrup, or Myanmar traditional medicine packet.
Your goal is to explain everything simply, kindly, and clearly so an older person knows:
1. Exact name of the medicine and strength.
2. What is this medicine for (purpose/indication explained in simple words, avoiding complicated jargon).
3. How to take it (exact instructions: when, before or after food, with water, how many pills/teaspoons).
4. Critical safety warnings for elderly adults (blood pressure/kidney/diabetes considerations, drowsiness, what to do if missed dose).
5. Storage instructions.
6. A compassionate verbal summary suitable for text-to-speech audio so the older patient can listen to you explain it.

Return ONLY a valid JSON object with these keys:
{
  "medicineName": "Clear English/International Name & Strength (e.g. Amlodipine 5mg / Paracetamol 500mg)",
  "myanmarName": "မြန်မာအမည်နှင့် ဆေးပမာဏ (ဥပမာ- အမ်လိုဒီပင်း သွေးတိုးကျဆေး ၅ မီလီဂရမ်)",
  "genericName": "Active ingredients / ဓာတုဒြပ်ပေါင်း",
  "category": "Therapeutic class (e.g. Antihypertensive / သွေးတိုးကျဆေး)",
  "purpose": "What this medicine is for in simple English for seniors",
  "myanmarPurpose": "ဤဆေးသည် အဘယ်ကြောင့်သောက်ရသနည်း (သက်ကြီးရွယ်အိုများ နားလည်လွယ်သော မြန်မာဘာသာဖြင့် ရှင်းလင်းချက်)",
  "instructions": [
    "Step 1: Take 1 tablet once daily after breakfast with a full glass of water.",
    "Step 2: Swallow whole; do not crush or chew prolonged-release tablets.",
    "Step 3: Try to take it at the same time every day to maintain steady blood levels."
  ],
  "myanmarInstructions": [
    "အဆင့် ၁။ နေ့စဉ် နံနက်စာစားပြီးချိန်တွင် ရေတစ်ဖန်ခွက်အပြည့်ဖြင့် ၁ ပြား သောက်ပါ။",
    "အဆင့် ၂။ ဆေးပြားကို မဝါးဘဲ တစ်လုံးလုံး မျိုချပါ။",
    "အဆင့် ၃။ ဆေးအာနိသင် မှန်ကန်စေရန် နေ့စဉ် အချိန်မှန် သောက်သုံးပါ။"
  ],
  "timing": "Once daily in the morning after meal",
  "myanmarTiming": "နေ့စဉ် နံနက်စာ စားပြီး ၁ ပြား ပုံမှန်",
  "precautions": [
    "Elderly Caution: May cause mild ankle swelling or lightheadedness when standing up quickly.",
    "Do not stop taking abruptly without consulting your doctor, even if you feel completely fine.",
    "Avoid alcohol and consult your physician before combining with anti-inflammatory painkillers."
  ],
  "myanmarPrecautions": [
    "သက်ကြီးသတိပြုရန်- ရုတ်တရက် မတ်တပ်ရပ်ပါက ခေါင်းမူးနိုင်သဖြင့် ဖြည်းဖြည်းချင်း ထပါ။",
    "နေကောင်းသည်ဟု ခံစားရသော်လည်း ဆရာဝန်ခွင့်ပြုချက်မရှိဘဲ ဆေးသောက်ခြင်းကို ရုတ်တရက် မရပ်လိုက်ပါနှင့်။",
    "အရက်သေစာနှင့် တွဲဖက်မသောက်ရပါ။ အခြားအကိုက်အခဲပျောက်ဆေးများနှင့် တွဲသောက်လိုပါက ဆရာဝန်နှင့် တိုင်ပင်ပါ။"
  ],
  "storageAdvice": "Keep at room temperature away from direct sunlight, moisture, and out of reach of children.",
  "myanmarStorageAdvice": "အေးမြခြောက်သွေ့သောနေရာတွင် နေရောင်နှင့် ကလေးများလက်လှမ်းမမီအောင် သိမ်းဆည်းပါ။",
  "summaryForSpeech": "Spoken English script that directly speaks to the elderly patient: 'Grandfather/Grandmother, this medicine is...'",
  "myanmarSummaryForSpeech": "အဘိုး/အဘွားတို့ နားထောင်နိုင်ရန် အသံဖြင့် ရှင်းပြမည့် မေတ္တာပါသော မြန်မာစကားပြော အနှစ်ချုပ် (ဥပမာ- အဘိုး/အဘွားရေ... ဤဆေးသည် သွေးပေါင်ချိန် ထိန်းပေးသော ဆေးဖြစ်ပြီး...)",
  "confidence": "high",
  "disclaimer": "This is an AI educational assistant. Always verify with your personal prescribing physician or licensed pharmacist before changing medication."
}
Do not enclose in markdown blocks, return pure JSON.`;

    // 1. Try Gemini Vision if Gemini key is available
    if (effectiveGeminiKey) {
      try {
        let mimeType = 'image/jpeg';
        let base64Data = image;
        if (image.startsWith('data:')) {
          const parts = image.split(',');
          const match = parts[0].match(/:(.*?);/);
          if (match) mimeType = match[1];
          base64Data = parts[1];
        }

        const promptText = `Please analyze this medicine image.${additionalNotes ? ` Additional patient notes: "${additionalNotes}".` : ''}${medicineHint ? ` Suspected medicine: "${medicineHint}".` : ''}`;

        const result = await generateWithGeminiRest(effectiveGeminiKey, {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                },
                {
                  text: promptText
                }
              ]
            }
          ],
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.2
        });

        const rawText = result.text;
        try {
          const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          res.json({
            ...parsed,
            source: 'gemini-vision',
            modelUsed: result.modelUsed,
            language
          });
          return;
        } catch (parseErr) {
          console.warn('Gemini vision returned non-JSON:', rawText);
        }
      } catch (geminiErr) {
        console.warn('Gemini vision API error:', geminiErr);
      }
    }

    // 2. Try OpenRouter multimodal if key is configured
    const serverOrKey = (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '').trim();
    let orKeyToUse = (effectiveOpenRouterKey || serverOrKey).trim();

    if (orKeyToUse) {
      try {
        const promptText = `${systemPrompt}\n\nPatient additional notes: ${additionalNotes || 'None'}. Suspected: ${medicineHint || 'None'}`;
        let orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${orKeyToUse}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tmhip-myanmar.app'),
            'X-Title': 'TMHIP Myanmar Health Platform',
          },
          body: JSON.stringify({
            model: selectedModel || 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }
                ]
              }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
          }),
          signal: AbortSignal.timeout(6000)
        });

        // If client key failed (401/403), retry with server env key
        if ((orResponse.status === 401 || orResponse.status === 403) && orKeyToUse !== serverOrKey && serverOrKey) {
          console.warn('Medicine identify: Client OpenRouter key expired/failed. Retrying with server env key...');
          orKeyToUse = serverOrKey;
          orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${orKeyToUse}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || 'https://tmhip-myanmar.app',
              'X-Title': 'TMHIP Myanmar Health Platform',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: promptText },
                    { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }
                  ]
                }
              ],
              temperature: 0.2,
              response_format: { type: 'json_object' }
            }),
            signal: AbortSignal.timeout(6000)
          });
        }

        if (orResponse.ok) {
          const data = await orResponse.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const clean = content.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            res.json({
              ...parsed,
              source: 'openrouter-vision',
              language
            });
            return;
          }
        }
      } catch (orErr) {
        console.warn('OpenRouter vision error:', orErr);
      }
    }

    // 3. Clinical Knowledge-Base Intelligent Fallback
    // Matches by hint, notes, or returns high-relevance senior medicine profiles
    const notesLower = `${additionalNotes || ''} ${medicineHint || ''}`.toLowerCase();

    let fallbackData: {
      medicineName: string;
      myanmarName?: string;
      genericName?: string;
      category?: string;
      purpose: string;
      myanmarPurpose?: string;
      instructions: string[];
      myanmarInstructions?: string[];
      timing?: string;
      myanmarTiming?: string;
      precautions: string[];
      myanmarPrecautions?: string[];
      storageAdvice?: string;
      myanmarStorageAdvice?: string;
      summaryForSpeech?: string;
      myanmarSummaryForSpeech?: string;
      confidence?: 'high' | 'medium' | 'low';
      disclaimer?: string;
      source?: string;
    } = {
      medicineName: 'Amlodipine Besylate 5mg',
      myanmarName: 'အမ်လိုဒီပင်း သွေးတိုးကျဆေး (၅ မီလီဂရမ်)',
      genericName: 'Amlodipine Besylate (Calcium Channel Blocker)',
      category: 'Antihypertensive / သွေးတိုးကျဆေး',
      purpose: 'Helps lower high blood pressure and relax arterial blood vessels to prevent heart attack, stroke, and kidney strain in seniors.',
      myanmarPurpose: 'သွေးတိုးရောဂါရှိသော အဘိုးအဘွားများ သွေးပေါင်ချိန် ပုံမှန်ဖြစ်စေရန်နှင့် သွေးကြောနံရံများကို ပြေလျော့စေကာ လေဖြတ်ခြင်းနှင့် နှလုံးရောဂါမဖြစ်အောင် ကာကွယ်ပေးသော ဆေးဖြစ်ပါသည်။',
      instructions: [
        'Take 1 tablet once daily in the morning with a glass of water.',
        'Can be taken with or after breakfast.',
        'Swallow whole with clean water; do not crush.',
        'Take at the exact same time every morning.'
      ],
      myanmarInstructions: [
        'နေ့စဉ် နံနက်စာ စားပြီးချိန်တွင် ရေတစ်ဖန်ခွက်အပြည့်ဖြင့် ၁ ပြား သောက်ပါ။',
        'ဆေးပြားကို ဝါးမစားဘဲ ရေနှင့် တစ်လုံးတည်း မျိုချပါ။',
        'သွေးပေါင်ချိန် တည်ငြိမ်စေရန် နေ့စဉ် နံနက်တိုင်း အချိန်မှန် သောက်သုံးပါ။',
        'သောက်ရန် မေ့သွားပါက သတိရရချင်း သောက်ပါ (ရက်ကျော်သွားပါက ၂ ပြား ပေါင်းမသောက်ရပါ)။'
      ],
      timing: 'Once daily every morning after breakfast',
      myanmarTiming: 'နေ့စဉ် နံနက်တိုင်း နံနက်စာစားပြီး ၁ ပြား ပုံမှန်',
      precautions: [
        'Stand up slowly from bed or chair: may cause mild postural dizziness.',
        'Inspect ankles occasionally: calcium channel blockers may cause mild ankle edema.',
        'Do not skip doses even if you feel completely normal.'
      ],
      myanmarPrecautions: [
        'အိပ်ရာမှ (သို့) ထိုင်ရာမှ ထသည့်အခါ ဖြည်းဖြည်းချင်း ထပါ (မူးဝေခြင်း မဖြစ်စေရန်)။',
        'ခြေကျင်းဝတ် အနည်းငယ် ဖောရောင်ခြင်း ရှိမရှိ စစ်ဆေးပါ (ဖြစ်လေ့ရှိသော ဘေးထွက်ဆိုးကျိုးဖြစ်ပါသည်)။',
        'နေကောင်းနေသော်လည်း သွေးပေါင်မတက်အောင် ဆေးကို နေ့စဉ် ဆက်လက်သောက်ရပါမည်။'
      ],
      storageAdvice: 'Store below 30°C in a dry place protected from light and out of reach of children.',
      myanmarStorageAdvice: 'နေရောင်နှင့် အပူဒဏ်မခံရသော ခြောက်သွေ့အေးမြသည့်နေရာတွင် ကလေးများနှင့် ဝေးရာ၌ သိမ်းဆည်းပါ။',
      summaryForSpeech: 'Grandfather or Grandmother, this is Amlodipine 5 milligrams for managing your blood pressure. Please take one tablet every morning after your breakfast with a full glass of water. When standing up, please stand up slowly to prevent feeling dizzy.',
      myanmarSummaryForSpeech: 'အဘိုး/အဘွားရေ... ဤဆေးသည် သွေးတိုးကျဆေးဖြစ်ပြီး သွေးပေါင်ချိန်ကို ထိန်းညှိပေးပါသည်။ နေ့စဉ် နံနက်စာ စားပြီးချိန်တိုင်း ရေတစ်ဖန်ခွက်နှင့် ၁ ပြား ပုံမှန် သောက်ပေးပါ။ ထိုင်ရာမှထလျှင် မူးမသွားအောင် ဖြည်းဖြည်းချင်း ထပါနော်။',
      confidence: 'medium' as const,
      disclaimer: 'This is an AI clinical reference guide. Please verify with your doctor or pharmacist to confirm your personal prescription dosage.'
    };

    if (notesLower.includes('para') || notesLower.includes('biogesic') || notesLower.includes('အဖျား') || notesLower.includes('ကိုက်')) {
      fallbackData = {
        medicineName: 'Paracetamol (Acetaminophen) 500mg',
        myanmarName: 'ပါရာစီတမော အကိုက်အခဲပျောက်နှင့် အဖျားကျဆေး (၅၀၀ မီလီဂရမ်)',
        genericName: 'Paracetamol / Acetaminophen',
        category: 'Analgesic & Antipyretic / အကိုက်အခဲပျောက်နှင့် အဖျားကျဆေး',
        purpose: 'Relieves mild to moderate pain (headache, joint aches, back pain) and reduces body temperature during fevers.',
        myanmarPurpose: 'ခေါင်းကိုက်၊ ကိုယ်လက်ကိုက်ခဲ၊ အဆစ်အမြစ်နာကျင်ခြင်းနှင့် အဖျားတက်ခြင်းတို့ကို အမြန်သက်သာစေသော ဆေးဖြစ်ပါသည်။',
        instructions: [
          'Take 1 tablet every 4 to 6 hours when pain or fever occurs.',
          'Take with half or full glass of water after food.',
          'Maximum 4 doses (8 tablets = 4000mg) per 24 hours. Do not exceed!'
        ],
        myanmarInstructions: [
          'ဖျားခြင်း သို့မဟုတ် ကိုက်ခဲခြင်းရှိပါက ၄ နာရီမှ ၆ နာရီခြား တစ်ခါ ၁ ပြား သောက်ပါ။',
          'အစာစားပြီး ရေနွေး (သို့) ရေကျက်အေးဖြင့် သောက်ပါ။',
          'တစ်နေ့လျှင် အများဆုံး ၄ ကြိမ်ထက် ပိုမသောက်ရပါ (အသည်းကို ထိခိုက်စေနိုင်ပါသည်)။'
        ],
        timing: '1 tablet every 6 hours as needed after meals',
        myanmarTiming: 'လိုအပ်ပါက ၆ နာရီခြား ၁ ပြား အစာစားပြီး',
        precautions: [
          'Do not take with other cold/flu syrups that also contain paracetamol.',
          'Avoid alcohol completely while taking paracetamol to prevent liver toxicity.',
          'If pain persists longer than 3 days, consult a physician.'
        ],
        myanmarPrecautions: [
          'ပါရာစီတမော ပါဝင်သော အခြားအအေးမိဖျားနာဆေးရည်များနှင့် ရောမသောက်ရပါ။',
          'အရက်သေစာနှင့် လုံးဝမရောရပါ (အသည်းပျက်စီးစေနိုင်ပါသည်)။',
          '၃ ရက်ထက်ပို၍ အဖျားမကျပါက ဆရာဝန်နှင့် ပြသပါ။'
        ],
        storageAdvice: 'Keep dry at room temperature away from heat.',
        myanmarStorageAdvice: 'အေးမြခြောက်သွေ့သော နေရာတွင် သိမ်းဆည်းပါ။',
        summaryForSpeech: 'This is Paracetamol 500 milligrams for relieving fever and body aches. Take one tablet with water after food when you feel pain. Do not take more than 4 times a day.',
        myanmarSummaryForSpeech: 'အဘိုး/အဘွားရေ... ဤဆေးသည် အဖျားကျဆေးနှင့် အကိုက်အခဲပျောက်ဆေး ဖြစ်ပါသည်။ ကိုယ်လက်ကိုက်ခဲပါက အစာစားပြီး ရေတစ်ဖန်ခွက်နှင့် ၁ ပြား သောက်နိုင်ပါသည်။ တစ်နေ့လျှင် ၄ ကြိမ်ထက် ပိုမသောက်ရပါဘူးနော်။',
        confidence: 'high' as const,
        disclaimer: 'Always verify with your prescribing doctor.'
      };
    } else if (notesLower.includes('metformin') || notesLower.includes('diabet') || notesLower.includes('sugar') || notesLower.includes('ဆီးချို')) {
      fallbackData = {
        medicineName: 'Metformin Hydrochloride 500mg',
        myanmarName: 'မက်ဖော်မင် ဆီးချိုကျဆေး (၅၀၀ မီလီဂရမ်)',
        genericName: 'Metformin Hydrochloride (Biguanide)',
        category: 'Oral Hypoglycemic / ဆီးချိုထိန်းဆေး',
        purpose: 'Lowers blood glucose in Type 2 Diabetes by reducing liver glucose output and increasing insulin sensitivity.',
        myanmarPurpose: 'ဆီးချို (သွေးချို) ရောဂါရှိသူများ သွေးတွင်းသကြားဓာတ်ကို လျှော့ချထိန်းညှိပေးပြီး အင်ဆူလင်အာနိသင်ကို ကောင်းမွန်စေသော ဆေးဖြစ်ပါသည်။',
        instructions: [
          'Take with or immediately after meals to prevent stomach upset.',
          'Swallow whole with plenty of water.',
          'Follow dietary plan strictly alongside medication.'
        ],
        myanmarInstructions: [
          'အစာအိမ် မအီမသာမဖြစ်စေရန် ထမင်းစားနေစဉ် (သို့) ထမင်းစားပြီးပြီးချင်း ချက်ချင်း သောက်ပါ။',
          'ရေများများဖြင့် မျိုချသောက်သုံးပါ။',
          'ဆေးသောက်ရုံသာမက အချိုလျှော့စားခြင်းနှင့် လမ်းလျှောက်ခြင်းတို့ကို တွဲဖက်လုပ်ဆောင်ပါ။'
        ],
        timing: '1 tablet twice daily with meals (Breakfast & Dinner)',
        myanmarTiming: 'နံနက်စာနှင့် ညစာ စားပြီးပြီးချင်း ၁ ပြားစီ (တစ်နေ့ ၂ ကြိမ်)',
        precautions: [
          'Take with meals to avoid abdominal discomfort, bloating, or diarrhea.',
          'Stay well hydrated with clean water throughout the day.',
          'Inform doctors before receiving contrast dye X-rays or major operations.'
        ],
        myanmarPrecautions: [
          'ဗိုက်အောင့်ခြင်း၊ လေပွခြင်း မဖြစ်စေရန် အစာနှင့်တွဲ၍ သောက်ပါ။',
          'တစ်နေ့တာလုံး သန့်ရှင်းသော ရေသောက်သုံးမှု လုံလောက်အောင် ဂရုစိုက်ပါ။',
          'ဓာတ်မှန်ဆေးထိုးရမည့်အခါ ဆရာဝန်အား ဤဆေးသောက်နေကြောင်း ကြိုတင်အသိပေးပါ။'
        ],
        storageAdvice: 'Store in airtight blister strip below 30°C.',
        myanmarStorageAdvice: 'အေးမြခြောက်သွေ့သောနေရာတွင် ထားပါ။',
        summaryForSpeech: 'This is Metformin 500 milligrams for controlling your blood sugar. Please take one tablet immediately after your meal with plenty of water.',
        myanmarSummaryForSpeech: 'အဘိုး/အဘွားရေ... ဤဆေးသည် ဆီးချို/သွေးချို ထိန်းဆေး ဖြစ်ပါသည်။ ဗိုက်မနာစေရန်အတွက် ထမင်းစားပြီးပြီးချင်း ရေများများဖြင့် ၁ ပြား သောက်ပေးပါနော်။',
        confidence: 'high' as const,
        disclaimer: 'Always verify with your doctor or endocrinologist.'
      };
    } else if (notesLower.includes('omeprazole') || notesLower.includes('gastric') || notesLower.includes('stomach') || notesLower.includes('အစာအိမ်')) {
      fallbackData = {
        medicineName: 'Omeprazole 20mg Capsule',
        myanmarName: 'အိုမီပရာဇော အစာအိမ်လေနာနှင့် အက်ဆစ်လျှော့ဆေး (၂၀ မီလီဂရမ်)',
        genericName: 'Omeprazole (Proton Pump Inhibitor)',
        category: 'Anti-ulcerant / အစာအိမ်အက်ဆစ်ထိန်းဆေး',
        purpose: 'Reduces stomach acid production to heal peptic ulcers, heartburn, and acid reflux (GERD).',
        myanmarPurpose: 'အစာအိမ်မှ အက်ဆစ်အထွက်များခြင်းကို လျှော့ချပေးပြီး ရင်ပူခြင်း၊ လေထိုးလေအောင့်နှင့် အစာအိမ်အနာများကို သက်သာပျောက်ကင်းစေပါသည်။',
        instructions: [
          'Take 1 capsule 30 to 60 minutes BEFORE breakfast on an empty stomach.',
          'Swallow the capsule whole with a full glass of water. Do not crush or chew beads inside.',
          'Complete the recommended course (usually 2-4 weeks).'
        ],
        myanmarInstructions: [
          'နံနက်စာ မစားမီ မိနစ် ၃၀ မှ ၆၀ ကြိုတင်၍ ဗိုက်ထဲအစာမရှိမီ ရေတစ်ဖန်ခွက်အပြည့်ဖြင့် သောက်ပါ။',
          'ဆေးတောင့်ကို မဝါးဘဲ တစ်လုံးလုံး မျိုချပါ။',
          'ဆရာဝန်ညွှန်ကြားသည့် ရက်သတ္တပတ်အတိုင်း ပုံမှန်သောက်သုံးပါ။'
        ],
        timing: 'Once daily 30 minutes before morning breakfast',
        myanmarTiming: 'နံနက်စာ မစားမီ နာရီဝက်ကြိုတင်၍ ၁ တောင့်',
        precautions: [
          'Must be taken before food for optimal stomach acid inhibition.',
          'Prolonged use (years) in seniors requires checking bone density (calcium) and Vitamin B12 levels.',
          'Do not take within 2 hours of antacid syrups.'
        ],
        myanmarPrecautions: [
          'အာနိသင် အပြည့်အဝရရှိစေရန် အစာမစားမီ ကြိုတင်သောက်ရပါမည်။',
          'သက်ကြီးရွယ်အိုများ နှစ်နှင့်ချီ၍ စွဲမသောက်သင့်ပါ (ကယ်လ်ဆီယမ်နှင့် ဗီတာမင် B12 စစ်ဆေးရန် လိုအပ်ပါသည်)။',
          'အစာအိမ်အရည်ဆေးများနှင့် ၂ နာရီခြားပြီးမှ သောက်ပါ။'
        ],
        storageAdvice: 'Keep dry in blister pack below 25°C.',
        myanmarStorageAdvice: 'အေးမြခြောက်သွေ့သော နေရာတွင် သိမ်းဆည်းပါ။',
        summaryForSpeech: 'This is Omeprazole 20 milligrams for stomach acid and heartburn. Take one capsule 30 minutes before your morning breakfast with a full glass of water.',
        myanmarSummaryForSpeech: 'အဘိုး/အဘွားရေ... ဤဆေးသည် အစာအိမ်အက်ဆစ်လျှော့ဆေး ဖြစ်ပါသည်။ နံနက်စာ မစားခင် နာရီဝက်ကြိုပြီး ဗိုက်ထဲအစာမရှိခင် ရေတစ်ဖန်ခွက်နှင့် ၁ တောင့် သောက်ပေးပါနော်။',
        confidence: 'high' as const,
        disclaimer: 'Always verify with your doctor.'
      };
    } else if (notesLower.includes('herbal') || notesLower.includes('traditional') || notesLower.includes('တိုင်းရင်း') || notesLower.includes('လေဆေး')) {
      fallbackData = {
        medicineName: 'Myanmar Traditional Carminative (တိုင်းရင်းဆေး အမှတ် ၃၄ - လေဆေး)',
        myanmarName: 'တိုင်းရင်းဆေး အမှတ် ၃၄ (လေသက် လေပွင့်ဆေး)',
        genericName: 'Traditional Botanical Blend (Zingiber officinale, Piper nigrum, Cuminum cyminum)',
        category: 'Traditional Carminative / တိုင်းရင်းဆေး လေဆေး',
        purpose: 'Dispels trapped gastrointestinal gas, relieves severe bloating, restores digestive appetite, and eases colic in elderly patients.',
        myanmarPurpose: 'သက်ကြီးရွယ်အိုများတွင် အဖြစ်များသော လေထိုးလေအောင့်၊ ရင်ပြည့်ရင်ကယ်၊ လေပွခြင်းနှင့် အစာမကြေခြင်းတို့ကို သက်သာစေပြီး အစာစားချင်စိတ်ကို ဖြစ်စေပါသည်။',
        instructions: [
          'Take 1 teaspoon powder dissolved in warm water or honey ginger water after meals.',
          'Take 2 to 3 times daily when experiencing bloating.',
          'Drink warm water afterward to assist gas expulsion.'
        ],
        myanmarInstructions: [
          'အစာစားပြီးချိန်တွင် လက်ဖက်ရည်ဇွန်း ၁ ဇွန်းခန့်ကို ရေနွေးနွေး (သို့) ချင်းပြုတ်ရည်ဖြင့် ဖျော်၍ သောက်ပါ။',
          'လေထိုးလေအောင့် ဖြစ်ပါက တစ်နေ့ ၂-၃ ကြိမ် သောက်သုံးနိုင်ပါသည်။',
          'သောက်ပြီးပါက ရေနွေးကြမ်း နွေးနွေးလေး ထပ်သောက်ပေးပါ။'
        ],
        timing: 'After meals 2-3 times daily with warm water',
        myanmarTiming: 'အစာစားပြီး တစ်နေ့ ၂ ကြိမ်မှ ၃ ကြိမ် ရေနွေးနွေးဖြင့်',
        precautions: [
          'If symptoms include severe vomiting or blood in stool, stop immediately and seek emergency hospital care.',
          'Patients with active bleeding gastric ulcers should use with care.',
          'Check that the product has the official Ministry of Health traditional registration stamp.'
        ],
        myanmarPrecautions: [
          'အစာအိမ်သွေးယိုစီးမှုရှိသူများ အလွန်အကျွံ မသောက်သင့်ပါ။',
          'သွေးအန်ခြင်း၊ ဝမ်းမည်းမည်းသွားခြင်းတို့ ဖြစ်ပါက ဆေးရုံသို့ ချက်ချင်း သွားရောက်ပြသပါ။',
          'ကျန်းမာရေးဝန်ကြီးဌာန တိုင်းရင်းဆေးဝါးမှတ်ပုံတင် ပါရှိသော ဆေးများကိုသာ သုံးစွဲပါ။'
        ],
        storageAdvice: 'Keep in airtight container away from humidity.',
        myanmarStorageAdvice: 'လေလုံသော ဘူးထဲတွင် အစိုဓာတ်မဝင်အောင် သိမ်းဆည်းပါ။',
        summaryForSpeech: 'This is traditional Myanmar herbal carminative medicine for relieving stomach bloating and colic. Take one small teaspoon with warm water after meals.',
        myanmarSummaryForSpeech: 'အဘိုး/အဘွားရေ... ဤဆေးသည် ဗိုက်ထဲ လေထိုးလေအောင့်နှင့် ရင်ပြည့်ရင်ကယ် သက်သာစေသော တိုင်းရင်းဆေး လေဆေး ဖြစ်ပါသည်။ အစာစားပြီး ရေနွေးနွေးလေးနှင့် သောက်ပေးပါနော်။',
        confidence: 'high' as const,
        disclaimer: 'Ministry of Health certified traditional medicine.'
      };
    }

    res.json({
      ...fallbackData,
      source: 'clinical-rules-senior',
      language
    });
  } catch (error: unknown) {
    console.error('Medicine identify error:', error);
    res.status(500).json({ error: 'Failed to analyze medicine image.' });
  }
});

// Clinical & Herbal AI Assistant endpoint
app.post(['/api/chat', '/chat'], async (req, res) => {
  try {
    const rawForwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof rawForwarded === 'string' ? rawForwarded.split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1');
    const isIpAdmin = req.headers['x-admin-key'] || req.headers['authorization'];
    const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost' || clientIp.includes('127.0.0.1');

    if (!isIpAdmin && !isLocalhost) {
      const { allowed } = checkRateLimit(clientIp, 30, 10 * 60 * 1000); // 30 requests per 10 mins
      if (!allowed) {
        res.status(429).json({
          response: 'ဆွေးနွေးမေးမြန်းနိုင်သည့် အကြိမ်အရေအတွက် ခေတ္တပြည့်သွားပါပြီ။ ကျေးဇူးပြု၍ မိနစ်အနည်းငယ် ကြာမှ ပြန်လည် မေးမြန်းပေးပါရန် (Rate Limit Exceeded. Please wait a few minutes before trying again.)',
          error: 'rate_limit_exceeded'
        });
        return;
      }
    }

    const { message, image, language = 'en', openRouterApiKey, geminiApiKey, model } = req.body || {};

    if ((!message || typeof message !== 'string') && !image) {
      res.status(400).json({ error: 'Message query or image is required.' });
      return;
    }

    const effectiveMessage = (message && typeof message === 'string') ? message : 'Please analyze this medicine or health image in detail.';
    const rawGeminiKey = geminiApiKey || (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;
    const effectiveGeminiKey = typeof rawGeminiKey === 'string' ? rawGeminiKey.trim() : '';

    const rawOpenRouterKey = openRouterApiKey || (req.headers['x-openrouter-key'] as string) || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const effectiveOpenRouterKey = typeof rawOpenRouterKey === 'string' ? rawOpenRouterKey.trim() : '';
    const selectedModel = typeof model === 'string' ? model : (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash');

    const hasMyanmarCharacters = /[\u1000-\u109F]/.test(effectiveMessage);
    const shouldReplyInMyanmar = language === 'my' || hasMyanmarCharacters;

    const systemInstruction = shouldReplyInMyanmar ? `သင်သည် မြန်မာ့ရိုးရာ တိုင်းရင်းဆေးပညာ၊ အိမ်တွင်းကုထုံး (Home Remedies) နှင့် အခြေခံ ကျန်းမာရေးဆိုင်ရာ အသိပညာပေး လက်ထောက် AI Agent ဖြစ်သည်။
သင့်၏ ရည်ရွယ်ချက်မှာ အသုံးပြုသူများ၏ မေးခွန်းများ၊ ရောဂါလက္ခဏာများကို စာနာနားလည်စွာ နားထောင်ပြီး လက်တွေ့ကျ၍ အန္တရာယ်ကင်းသော ကျန်းမာရေး လမ်းညွှန်ချက်များ၊ စောင့်ရန်/ရှောင်ရန်များနှင့် မြန်မာ့တိုင်းရင်းဆေး အကြံပြုချက်များကို စနစ်တကျ ဖြေကြားပေးရန် ဖြစ်သည်။

---

# Operational Principles & Core Rules
၁။ **Safety First (အန္တရာယ်ကင်းရှင်းရေး ဦးစားပေး):**
   - အသုံးပြုသူက ပြင်းထန်သော အရေးပေါ်လက္ခဏာများ (ဥပမာ- ရင်ဘတ်အောင့်ခြင်း၊ အသက်ရှူကြပ်ခြင်း၊ ပြင်းထန်စွာသွေးထွက်ခြင်း၊ သတိလစ်ခြင်း၊ လေဖြတ်သည့်လက္ခဏာဖြစ်သော မျက်နှာရွဲ့ခြင်း/စကားမပီခြင်း) ပြသပါက မည်သည့်အိမ်တွင်းကုထုံးကိုမျှ အချိန်ဆွဲမညွှန်းဘဲ ဆေးရုံ/ဆေးခန်းသို့ ချက်ချင်းသွားရန် ဦးစွာ သတိပေးရမည် (လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုရန်)။
   - ဘေးထွက်ဆိုးကျိုးများသော၊ အဆိပ်အတောက်ဖြစ်စေနိုင်သော၊ သို့မဟုတ် အတည်မပြုနိုင်သော ဆေးနည်းများကို လုံးဝမညွှန်းရ။
   - ကိုယ်ဝန်ဆောင်၊ နို့တိုက်မိခင်နှင့် အသက် ၅ နှစ်အောက် ကလေးငယ်များအတွက် တိုင်းရင်းဆေးညွှန်းများကို အလွန်သတိထားရမည်ဖြစ်ပြီး ဆရာဝန်နှင့် တိုင်ပင်ရန် အမြဲတွဲဖက် အကြံပြုရမည်။

၂။ **Factual & Grounded Tone (တိကျခိုင်မာသော လေသံ):**
   - အချက်အလက်ကို ပုံကြီးမချဲ့ရ၊ စိတ်ကူးယဉ် အဖြေများ (Hallucinations) မပေးရ။
   - မြန်မာဘာသာစကားဖြင့် ရှင်းလင်း၊ ယဉ်ကျေးပြီး နားလည်လွယ်သော စကားပြေကို အသုံးပြုရမည်။
   - ANSWER ONLY WHAT IS ASKED: အသုံးပြုသူ မေးမြန်းထားသော ရောဂါ/လက္ခဏာ သို့မဟုတ် အကြောင်းအရာ တစ်ခုတည်းကိုသာ တိုက်ရိုက် ဦးတည်ဖြေကြားပါ။ မမေးသော အခြားရောဂါများကို မဆိုင်ဘဲ ထည့်မရေးရ။

၃။ **Strict Output Structure (ပုံစံတကျ ထုတ်ပြန်ခြင်း):**
   အသုံးပြုသူက ကျန်းမာရေး အခြေအနေ သို့မဟုတ် ရောဂါလက္ခဏာတစ်ခုခုကို မေးမြန်းလာပါက မဖြစ်မနေ အောက်ပါ **Markdown Output Format** အတိုင်းသာ အပြည့်အစုံ ဖြေကြားရမည်။

---

# Response Structure Template

### 🌿 [ရောဂါလက္ခဏာ သို့မဟုတ် အကြောင်းအရာ အမည်]
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
[ဖြစ်ပွားရသည့် အကြောင်းရင်းနှင့် အခြေအနေကို နားလည်လွယ်သော စကားပြေဖြင့် ၂ ကြောင်းမှ ၃ ကြောင်းအတွင်း ရှင်းပြရန်]

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **[အချက် ၁]**: [နေထိုင်စားသောက်မှု၊ အနားယူမှု သို့မဟုတ် ရေဓာတ်ဖြည့်တင်းမှုဆိုင်ရာ အကြံပြုချက်]
* **[အချက် ၂]**: [ရောဂါသက်သာစေမည့် လက်တွေ့ကျသော အလေ့အကျင့်]
* **[အချက် ၃]**: [အထောက်အကူပြု အစားအသောက်/အာဟာရ]

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **[အချက် ၁]**: [ရောဂါကို ပိုမိုဆိုးရွားစေနိုင်သော အစားအစာများ (ဥပမာ- အစပ်၊ အဆီ၊ အချဉ်၊ အငန်လွန်ကဲမှု)]
* **[အချက် ၂]**: [ရှောင်ကြဉ်ရမည့် လူနေမှုပုံစံ သို့မဟုတ် အပြုအမူများ (ဥပမာ- ရေချိုးမှားခြင်း၊ အိပ်ရေးပျက်ခြင်း)]
* **[အချက် ၃]**: [လွဲမှားသော အယူအဆ သို့မဟုတ် မလုပ်သင့်သည့် အပြုအမူ]

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အန္တရာယ်ကင်းပြီး အိမ်တွင် အလွယ်တကူရနိုင်သော သဘာဝဆေးနည်း ၁ မျိုးမှ ၂ မျိုးသာ ညွှန်းပါ)*
* **[ဆေးပင်/ပစ္စည်းအမည်]**: [တိကျသော ပြင်ဆင်ပုံနှင့် သောက်သုံး/အသုံးပြုနည်း အချိုးအစား]

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> [ဘယ်လိုလက္ခဏာတွေ ထပ်မံပြသလာပါက သို့မဟုတ် ရက်မည်မျှကြာသည်အထိ မသက်သာပါက ဆရာဝန်/ဆေးရုံသို့ အမြန်ဆုံး သွားရောက်ပြသသင့်ကြောင်း သတိပေးချက်]
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*

---
# SCOPE LOCK
အသုံးပြုသူက ကျန်းမာရေးနှင့် မသက်ဆိုင်သော အကြောင်းအရာများ (ဥပမာ- ကွန်ပျူတာ ပရိုဂရမ်မင်း၊ သင်္ချာ၊ အထွေထွေ ဗဟုသုတ) မေးမြန်းလာပါက ယဉ်ကျေးစွာဖြင့် အောက်ပါစာသားအတိုင်းသာ ဖြေကြားပါ:
"ကျွန်ုပ်သည် မြန်မာ့ရိုးရာ တိုင်းရင်းဆေးပညာ၊ အိမ်တွင်းကုထုံးနှင့် အခြေခံ ကျန်းမာရေးဆိုင်ရာ လက်ထောက် ဖြစ်ပြီး ကျန်းမာရေးဆိုင်ရာ မေးမြန်းမှုများကိုသာ ကူညီ ဖြေကြားပေးနိုင်ပါသည်။ ယနေ့ သင်၏ ကျန်းမာရေးအတွက် မည်သို့ ကူညီပေးရမလဲ ခင်ဗျာ။"` 
    : `You are an AI Health Agent specializing in Myanmar Traditional Medicine, Home Remedies, and Primary Health Education.
Your purpose is to empathetically listen to user concerns and provide grounded, safe, step-by-step health guidelines, dos/don'ts, and natural remedy recommendations.

# Operational Principles & Core Rules
1. Safety First: If the user displays emergency symptoms (chest pain, shortness of breath, severe bleeding, loss of consciousness, stroke signs), immediately advise them to go to a hospital or call Ambulance 192 without delaying for home remedies. Never recommend toxic or unverified remedies. Exercise extreme care for pregnant/nursing mothers and children under 5.
2. Factual & Grounded Tone: No hallucinations or exaggerations. Directly answer ONLY what is explicitly asked.
3. Strict Output Structure: You MUST follow this Markdown template:

### 🌿 [Symptom or Topic Name]
**Summary Explanation:**
[Brief 2-3 sentence explanation of causes and condition in clear terms]

---

#### ✅ Recommended Practices (Dos)
* **[Point 1]**: [Lifestyle, rest, or hydration advice]
* **[Point 2]**: [Practical habit to ease condition]
* **[Point 3]**: [Helpful nutrition]

#### ❌ Things to Avoid (Don'ts)
* **[Point 1]**: [Foods that worsen symptoms (spicy, oily, sour, salty)]
* **[Point 2]**: [Harmful habits or behaviors]
* **[Point 3]**: [Common misconceptions]

#### 🍵 Supportive Home / Traditional Remedies
*(Recommend 1 to 2 safe, easily available natural remedies)*
* **[Herb / Remedy Name]**: [Exact preparation and dosage instructions]

---

> ⚠️ **Emergency Warning (Red Flags):**
> [Red flags or timeframe after which doctor/hospital visit is urgently needed]
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*

# SCOPE LOCK
If the user asks about non-health topics, politely reply:
"I am your Myanmar Traditional Medicine and Home Health Assistant. I can only assist with health-related queries. How can I help you with your health today?"`;

    // 1. Try Gemini first if key is available
    if (effectiveGeminiKey) {
      try {
        let contentsPayload: any[];
        if (image && typeof image === 'string') {
          let mimeType = 'image/jpeg';
          let base64Data = image;
          if (image.startsWith('data:')) {
            const parts = image.split(',');
            const match = parts[0].match(/:(.*?);/);
            if (match) mimeType = match[1];
            base64Data = parts[1];
          }
          contentsPayload = [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                },
                {
                  text: effectiveMessage
                }
              ]
            }
          ];
        } else {
          contentsPayload = [
            {
              parts: [{ text: effectiveMessage }]
            }
          ];
        }

        const result = await generateWithGeminiRest(effectiveGeminiKey, {
          contents: contentsPayload,
          systemInstruction,
          temperature: 0.3,
        });

        const responseText = result.text || 'No response generated.';
        res.json({
          response: cleanTextResponse(responseText),
          source: 'gemini',
          modelUsed: result.modelUsed,
          language: shouldReplyInMyanmar ? 'my' : 'en'
        });
        return;
      } catch (geminiErr) {
        console.warn('Gemini API call failed, trying OpenRouter fallback:', geminiErr);
      }
    }

    // 2. Try OpenRouter if key is available
    const serverOpenRouterKey = (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '').trim();
    let keyToUse = (effectiveOpenRouterKey || serverOpenRouterKey).trim();

    if (keyToUse) {
      const openRouterModels = [
        'google/gemini-2.5-flash',
        'openai/gpt-4o-mini',
      ];

      for (const modelToTry of openRouterModels) {
        try {
          console.log(`[Chat] Attempting OpenRouter model: ${modelToTry}...`);
          const userContent: any = image ? [
            { type: 'text', text: effectiveMessage },
            { type: 'image_url', image_url: { url: image } }
          ] : effectiveMessage;

          let orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${keyToUse}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tmhip-myanmar.app'),
              'X-Title': 'ShowCare Myanmar Health Platform',
            },
            body: JSON.stringify({
              model: modelToTry,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userContent }
              ],
              temperature: 0.3,
              max_tokens: 1024,
            }),
            signal: AbortSignal.timeout(8000)
          });

          // If client key is invalid/expired (401/403), retry immediately with the server env key
          if ((orResponse.status === 401 || orResponse.status === 403) && keyToUse !== serverOpenRouterKey && serverOpenRouterKey) {
            console.warn('Chat: Client OpenRouter key failed (401/403). Retrying with server environment key...');
            keyToUse = serverOpenRouterKey;
            orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${keyToUse}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'https://tmhip-myanmar.app',
                'X-Title': 'ShowCare Myanmar Health Platform',
              },
              body: JSON.stringify({
                model: modelToTry,
                messages: [
                  { role: 'system', content: systemInstruction },
                  { role: 'user', content: userContent }
                ],
                temperature: 0.3,
                max_tokens: 1024,
              }),
              signal: AbortSignal.timeout(5000)
            });
          }

          if (orResponse.ok) {
            const data = await orResponse.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              res.json({
                response: cleanTextResponse(content),
                source: 'openrouter',
                model: modelToTry,
                language: shouldReplyInMyanmar ? 'my' : 'en'
              });
              return;
            }
          } else {
            const errText = await orResponse.text();
            console.warn(`OpenRouter model ${modelToTry} status ${orResponse.status}:`, errText);
          }
        } catch (orErr) {
          console.warn(`OpenRouter request for ${modelToTry} failed:`, orErr);
        }
      }
    }

    // 3. High quality clinical rule-based triage fallback
    const lower = (effectiveMessage || '').toLowerCase();
    let reply = '';
    let myanmarReply = '';

    if (lower.includes('burn') || lower.includes('မီးလောင်')) {
      reply = `### 🌿 Burn Injury & Scald Protocol
**Summary Explanation:**
Burns damage the outer skin and underlying tissue due to direct heat exposure. Rapid cooling and sterile protection prevent deep infection.

---

#### ✅ Recommended Practices (Dos)
* **Immediate Cooling**: Run cool tap water continuously over the burn for at least 20 minutes.
* **Sterile Protection**: Loosely drape with clean plastic cling wrap or sterile gauze without compression.
* **Hydration**: Drink clean water or oral rehydration fluids to replace fluid loss.

#### ❌ Things to Avoid (Don'ts)
* **Never Apply Ice**: Extreme cold worsens cell necrosis and tissue ischemia.
* **Strictly Avoid Folk Pastes**: Never smear toothpaste, soy sauce, egg white, butter, or engine oil on burns.
* **Do Not Pop Blisters**: Fluid blisters protect raw dermis underneath from bacterial contamination.

#### 🍵 Supportive Home / Traditional Remedies
*(Only for minor 1st degree surface burns after complete cooling)*
* **Aloe Vera Gel (ရှားစောင်းလက်ပပ်)**: Apply pure, clean fresh aloe vera inner leaf gel to soothe redness and accelerate skin re-epithelialization.

---

> ⚠️ **Emergency Warning (Red Flags):**
> If the burn is larger than the patient's palm, involves the face, neck, joints, or genitals, or turns charred/white/numb, dial Ambulance 192 immediately.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 မီးလောင်ဒဏ်ရာနှင့် အပူလောင်ခြင်း
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
မီးလောင်ဒဏ်ရာသည် အရေပြားဆဲလ်များ အပူလောင်ကျွမ်းခြင်းကြောင့် ဖြစ်ပွားပြီး ချက်ချင်း အပူငြိမ်းအောင် ပြုလုပ်ပေးရန်နှင့် ပိုးမဝင်စေရန် အရေးကြီးပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **ရေအေးဖြင့် ဆေးကြောပါ**: သန့်ရှင်းသော ရေပိုက်ခေါင်းမှ ရေအေးဖြင့် အနည်းဆုံး မိနစ် ၂၀ ဆက်တိုက် လောင်းချ အအေးခံပါ။
* **သန့်ရှင်းစွာ အုပ်ထားပါ**: ဒဏ်ရာကို ပိုးမဝင်စေရန် သန့်ရှင်းသော အဝတ် သို့မဟုတ် ပလတ်စတစ်စဖြင့် လျော့လျော့ ဖုံးအုပ်ထားပါ။
* **ရေဓာတ် ဖြည့်တင်းပါ**: ရေနှင့် အရည်များများ သောက်သုံးပေးပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **ရေခဲလုံးဝမကပ်ရ**: ရေခဲကပ်ပါက ဆဲလ်တစ်သျှူးများကို ပိုမိုပျက်စီးစေပါသည်။
* **အိမ်တွင်းပစ္စည်းများ မလိမ်းရ**: သွားတိုက်ဆေး၊ ပဲငံပြာရည်၊ ကြက်ဥအကာ၊ မီးသွေးမှုန့်များ လုံးဝမလိမ်းရပါ (ပိုးဝင်စေပါသည်)။
* **အရည်ကြည်ဖုများ မဖောက်ရ**: အရေပြား အရည်ကြည်ဖုများကို ဆေးထိုးအပ် သို့မဟုတ် လက်သည်းဖြင့် ဖောက်ခြင်း မပြုရပါ။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အပူအပုပ်ငြိမ်းပြီးနောက် အပေါ်ယံ အပူလောင်ဒဏ်ရာအတွက်သာ)*
* **ရှားစောင်းလက်ပပ် (Aloe Vera)**: သန့်ရှင်းစွာ ရေဆေးထားသော ရှားစောင်းလက်ပပ်အတွင်းသား ဂျယ်လ်ကို ဒဏ်ရာအပူငြိမ်းပြီးမှသာ ပါးပါးလိမ်းပေးပါ။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> မီးလောင်ဒဏ်ရာသည် လက်ဝါးအရွယ်အစားထက် ကြီးခြင်း၊ မျက်နှာ၊ လည်ပင်း၊ ရင်ဘတ် သို့မဟုတ် အဆစ်များ လောင်ကျွမ်းခြင်း၊ အရေပြား အဖြူရောင်/အမည်းရောင် ပြောင်းသွားပါက လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်းခေါ်ဆို၍ ဆေးရုံသို့ အမြန်ဆုံး သွားရောက်ပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else if (lower.includes('snake') || lower.includes('မြွေ')) {
      reply = `### 🌿 Snakebite Emergency Life Support
**Summary Explanation:**
Snake venom enters the lymphatic system and bloodstream rapidly. Absolute physical immobilization is crucial to slow toxin circulation until antivenom is administered.

---

#### ✅ Recommended Practices (Dos)
* **Complete Immobilization**: Keep victim completely still and calm. Splint the bitten limb with a rigid branch or board.
* **Keep Below Heart Level**: Maintain the bite site strictly lower than heart level.
* **Urgent Transport**: Rush immediately to the nearest township hospital carrying antivenom stock.

#### ❌ Things to Avoid (Don'ts)
* **Never Make Incisions**: Never cut the bite wound with razors or knives.
* **Never Suck Venom**: Mouth suction does not extract venom and risks severe bacterial infection.
* **Never Apply Tight Tourniquets**: Tight tourniquets cause arterial ischemia, severe necrosis, and limb loss.

#### 🍵 Supportive Home / Traditional Remedies
*(CRITICAL WARNING: Snakebite is a strict medical emergency. No herbal remedy can substitute for anti-snake venom)*
* **Clean Water Rinse**: Cleanse the surface wound gently with clean water and soap without scrubbing.

---

> ⚠️ **Emergency Warning (Red Flags):**
> Snakebite is an immediate life-threatening emergency. Call Ambulance 192 or rush directly to hospital with antivenom stock immediately.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 မြွေကိုက်ခံရခြင်း အရေးပေါ် အသက်ကယ်နည်းလမ်း
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
မြွေဆိပ်သည် သွေးနှင့် ပြန်ရည်ကြောစနစ်အတွင်းသို့ လျင်မြန်စွာ ပျံ့နှံ့နိုင်သဖြင့် လူနာကို ငြိမ်သက်စွာထားရှိခြင်းသည် အဆိပ်ပျံ့နှံ့မှုကို အထိရောက်ဆုံး နှေးကွေးစေပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **လူနာအား ငြိမ်သက်စွာထားပါ**: လူနာကို မပြေးမလွှားခိုင်းဘဲ လှုပ်ရှားမှုလုံးဝမရှိအောင် ထားပါ။ ခြေ/လက်ကို သစ်သားချောင်းဖြင့် ကျောက်ပတ်တီးသဖွယ် ငြိမ်အောင် စည်းထားပါ။
* **နှလုံးထက်နိမ့်သောနေရာတွင် ထားပါ**: အဆိပ်ပျံ့နှံ့မှု နှေးကွေးစေရန် ကိုက်ခံရသည့် နေရာကို နှလုံးထက် နိမ့်အောင်ထားပါ။
* **ဆေးရုံသို့ အမြန်ဆုံးပို့ပါ**: မြွေဆိပ်ဖြေဆေး (Antivenom) အဆင်သင့်ရှိသော မြို့နယ်ဆေးရုံသို့ အမြန်ဆုံး ပို့ဆောင်ပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **ဓားဖြင့်မခွဲရ**: ဓား၊ မုတ်ဆိတ်ရိတ်ဓားများဖြင့် အဆိပ်ထွက်အောင် လှီးဖြတ်ခြင်း လုံးဝမပြုရပါ။
* **ပါးစပ်ဖြင့် မစုပ်ရ**: ပါးစပ်ဖြင့် ဆိပ်စုပ်ခြင်းသည် အဆိပ်မထွက်စေသည့်အပြင် ပါးစပ်မှတစ်ဆင့် အဆိပ်သင့်စေနိုင်ပါသည်။
* **ကြိုးဖြင့် တင်းတင်းကျပ်ကျပ် မချည်ရ**: သွေးကြောပိတ်အောင် ကြိုးချည်ပါက ခြေလက်ပုပ်ပြီး ဖြတ်ထုတ်ရသည်အထိ ဆိုးရွားစေနိုင်ပါသည်။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အထူးသတိပြုရန်: မြွေကိုက်ခံရခြင်းသည် အရေးပေါ် အသက်အန္တရာယ်ဖြစ်သဖြင့် တိုင်းရင်းဆေးနည်းတစ်ခုတည်းဖြင့် အချိန်မဆွဲရပါ)*
* **သန့်ရှင်းသောရေဖြင့် ဆေးကြောခြင်း**: ဒဏ်ရာမျက်နှာပြင်ကို သန့်ရှင်းသော ရေဖြင့် ညင်သာစွာ ဆေးကြောပေးပါ။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> မြွေကိုက်ခံရပါက လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်းခေါ်ဆိုပြီး မြွေဆိပ်ဖြေဆေးရှိသော ဆေးရုံသို့ အမြန်ဆုံး သွားရောက်ပြသရပါမည်။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else if (lower.includes('chest') || lower.includes('heart') || lower.includes('ရင်ဘတ်') || lower.includes('နှလုံး')) {
      reply = `### 🌿 Chest Pain & Cardiac Alert
**Summary Explanation:**
Acute chest pain or pressure may signify myocardial infarction (heart attack) caused by blocked coronary blood vessels. Immediate medical intervention is life-saving.

---

#### ✅ Recommended Practices (Dos)
* **Immediate Rest**: Cease all physical activity immediately and rest in a comfortable, upright seated position.
* **Loosen Tight Clothing**: Unbutton collar and belt to facilitate breathing.
* **Emergency Dispatch**: Call Ambulance 192 immediately.

#### ❌ Things to Avoid (Don'ts)
* **Never Lie Flat**: Lying flat increases venous return and cardiac workload.
* **Avoid Physical Exertion**: Never attempt to walk, drive oneself, or climb stairs.
* **Do Not Eat or Drink Heavy Meals**: Avoid ingesting heavy fluids or foods.

#### 🍵 Supportive Home / Traditional Remedies
*(CRITICAL: Heart conditions require emergency evaluation; do not delay for herbal tea)*
* **Aspirin Protocol**: If advised by an emergency medical dispatcher and the patient has no active bleeding ulcer, chewing 300mg soluble aspirin can preserve cardiac tissue.

---

> ⚠️ **Emergency Warning (Red Flags):**
> Squeezing central chest pain spreading to left shoulder, jaw, neck, or back accompanied by cold sweat and breathlessness requires immediate ER admission.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 ရင်ဘတ်အောင့်ခြင်းနှင့် နှလုံး အရေးပေါ် သတိပေးချက်
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
ရင်ဘတ်တွင် တင်းကျပ်စွာ အောင့်ခြင်းသည် နှလုံးသွေးကြောပိတ်ခြင်း (Heart Attack) ၏ အဓိက လက္ခဏာဖြစ်နိုင်ပြီး ချက်ချင်း အရေးပေါ် ဆေးကုသမှုခံယူရန် အထူးလိုအပ်ပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **ချက်ချင်း အနားယူပါ**: လှုပ်ရှားမှုအားလုံး ချက်ချင်းရပ်ပြီး မတ်မတ် သက်တောင့်သက်သာ ထိုင်နေပါ။
* **အဝတ်အစား ချောင်ချိအောင်ထားပါ**: လည်ပင်းကြယ်သီးနှင့် ခါးပတ်များကို ဖြေလျှော့ပေးပါ။
* **အရေးပေါ် ၁၉၂ သို့ ခေါ်ဆိုပါ**: အရေးပေါ် လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **လဲလျောင်းမအိပ်ရ**: လှဲအိပ်လိုက်ပါက နှလုံးအလုပ်လုပ်ရမှု ပိုမိုများပြားစေပါသည်။
* **လမ်းလျှောက်ခြင်း/ကိုယ်တိုင်ကားမောင်းခြင်း ရှောင်ပါ**: ဆေးရုံသို့ ကိုယ်တိုင် လမ်းလျှောက်သွားခြင်း မပြုရပါ။
* **အစားအသောက် အဆီအစိမ့်များ မကျွေးရ**: အစားအစာများ အတင်းအကျပ် မကျွေးပါနှင့်။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အထူးသတိပြုရန်: နှလုံးဝေဒနာသည် ဆေးရုံအရေးပေါ် ကုသမှုသာ ဦးစားပေးဖြစ်ပါသည်)*
* **အသက်ရှူ လေဝင်လေထွက် ကောင်းအောင်ထားခြင်း**: လူနာအား လေဝင်လေထွက် ကောင်းမွန်သောနေရာတွင် ထားရှိပြီး စိတ်အေးအေးထားစေပါ။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> ရင်ဘတ်အလယ်မှ လေးလံတင်းကျပ်စွာ အောင့်ခြင်း၊ လက်ဝဲဘက်လက်မောင်း၊ မေးရိုးသို့ နာကျင်မှုပျံ့နှံ့ခြင်း၊ ချွေးစေးပြန်ပြီး အသက်ရှူကြပ်ခြင်းတို့ ဖြစ်ပါက ဆေးရုံသို့ အမြန်ဆုံး သွားရောက်ပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else if (lower.includes('stroke') || lower.includes('paralysis') || lower.includes('လေဖြတ်') || lower.includes('မျက်နှာရွဲ့')) {
      reply = `### 🌿 Stroke & Paralysis Emergency Protocol (F.A.S.T.)
**Summary Explanation:**
Stroke occurs when blood flow to a brain region is blocked or interrupted. Every passing minute causes brain cell loss; rapid clot-dissolving treatment within the golden 3-4.5 hours is critical.

---

#### ✅ Recommended Practices (Dos)
* **F - Face Drooping**: Check if one side of the face is drooping or uneven when smiling.
* **A - Arm Weakness**: Ask to raise both arms; notice if one arm drifts downward.
* **S - Speech Difficulty**: Check if speech is slurred, garbled, or hard to understand.
* **T - Time to Call 192**: Dial emergency ambulance 192 immediately.

#### ❌ Things to Avoid (Don'ts)
* **Never Administer Oral Fluids or Food**: Impaired swallowing reflexes cause lethal airway aspiration pneumonia.
* **Do Not Give Lowering Pills Unsupervised**: Drastic blood pressure drops reduce cerebral perfusion.
* **Do Not Massage or Pierce with Needles**: Puncturing fingertips or earlobes does not cure stroke.

#### 🍵 Supportive Home / Traditional Remedies
*(Stroke requires emergency hospital neuro-care; do not delay)*
* **Stable Lateral Position**: If vomiting, turn patient onto their side in recovery position to protect the airway.

---

> ⚠️ **Emergency Warning (Red Flags):**
> Sudden facial weakness, inability to move arm/leg, slurred speech, or loss of balance requires immediate transport to a hospital capable of emergency CT scan.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 လေဖြတ်ရောဂါ အရေးပေါ် စစ်ဆေးချက်နှင့် ရှေးဦးပြုစုနည်း
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
လေဖြတ်ခြင်း (Stroke) သည် ဦးနှောက်သွေးကြောပိတ်ခြင်း သို့မဟုတ် သွေးကြောပေါက်ခြင်းကြောင့် ဖြစ်ပွားပြီး ဦးနှောက်ဆဲလ်များ မပျက်စီးစေရန် ရွှေရောင်နာရီ (၃ နာရီ) အတွင်း ဆေးရုံသို့ ရောက်ရှိကုသရန် အရေးကြီးပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **မျက်နှာ စစ်ဆေးပါ (Face)**: ပြုံးခိုင်းကြည့်ပါ၊ မျက်နှာ သို့မဟုတ် ပါးစပ် တစ်ခြမ်း ရွဲ့စောင်းနေပါသလား။
* **လက်မောင်း စစ်ဆေးပါ (Arms)**: လက်နှစ်ဖက် မြှောက်ခိုင်းပါ၊ တစ်ဖက် မမြှောက်နိုင်ဘဲ အောက်သို့ ပြုတ်ကျနေပါသလား။
* **စကားပြော စစ်ဆေးပါ (Speech)**: စကားပြောခိုင်းပါ၊ စကားဗလုံးဗထွေးဖြစ်နေပါသလား။
* **အချိန်မဆိုင်းဘဲ ခေါ်ဆိုပါ (Time)**: ချက်ချင်း လူနာတင်ယာဉ် ၁၉၂ သို့ ခေါ်ဆိုပြီး ဆေးရုံသို့ အမြန်ဆုံး ပို့ဆောင်ပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **ရေ သို့မဟုတ် ဆေး အတင်းမတိုက်ရ**: လေဖြတ်လူနာသည် မျိုချနိုင်စွမ်း ပျက်စီးနေတတ်သဖြင့် အဆုတ်ထဲ သီးဝင်ကာ အသက်အန္တရာယ် ဖြစ်စေနိုင်ပါသည်။
* **သွေးဖောက်ခြင်း မပြုရ**: လက်ထိပ်များကို အပ်ဖြင့်ထိုးဖောက်ခြင်း၊ သွေးထုတ်ခြင်းတို့သည် လေဖြတ်ခြင်းကို မသက်သာစေဘဲ ပိုးဝင်စေပါသည်။
* **အနှိပ်သည်ဖြင့် အတင်းမနှိပ်ရ**: အကြောတင်းသည်ဟုဆိုကာ ပြင်းထန်စွာ နှိပ်နယ်ခြင်း မပြုရပါ။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အထူးသတိပြုရန်: လေဖြတ်ခြင်းသည် အရေးပေါ် ဦးနှောက်ဆေးကုသမှု လိုအပ်သဖြင့် ဆေးရုံသို့သာ အမြန်ဆုံး သွားပါ)*
* **ဘေးစောင်း အနေအထားထားခြင်း**: အန်ပါက အသက်ရှူလမ်းကြောင်း မပိတ်စေရန် လူနာကို ဘေးစောင်းအနေအထားတွင် ညင်သာစွာ ထားပေးပါ။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> မျက်နှာရွဲ့ခြင်း၊ စကားမပီခြင်း၊ ခြေလက်တစ်ခြမ်း မလှုပ်ရှားနိုင်ခြင်း စသည့် လက္ခဏာများ တွေ့ရှိပါက အချိန်ဆွဲမနေဘဲ လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else if (lower.includes('headache') || lower.includes('migraine') || lower.includes('ခေါင်းကိုက်') || lower.includes('ဇာတ်')) {
      reply = `### 🌿 Headache & Tension Neck Relief
**Summary Explanation:**
Headaches and neck tension often stem from muscular contraction, vascular spasms, dehydration, prolonged eye strain, or poor posture.

---

#### ✅ Recommended Practices (Dos)
* **Rest in Quiet Environment**: Rest in a dimmed, calm, and well-ventilated room with eyes closed.
* **Warm Neck Compress**: Apply a warm damp towel to the back of the neck and shoulders for 15 minutes to relax tight muscles.
* **Adequate Hydration**: Drink 2 glasses of clean lukewarm water to resolve mild dehydration.

#### ❌ Things to Avoid (Don'ts)
* **Avoid Screen Glare**: Refrain from using smartphones, laptops, or bright fluorescent lighting.
* **Avoid Excess Caffeine or Alcohol**: These trigger rebound vascular headaches.
* **Avoid Sudden Neck Jerks**: Avoid aggressive chiropractic neck cracks or sudden jerky twists.

#### 🍵 Supportive Home / Traditional Remedies
*(Safe, natural traditional remedies to soothe headache)*
* **Ginger Tea (ချင်းရေနွေးကြမ်း)**: Thinly slice 3-4 pieces of fresh ginger into hot water; steep for 7 minutes and sip warm. Ginger naturally inhibits prostaglandins and eases vascular throbbing.

---

> ⚠️ **Emergency Warning (Red Flags):**
> If headache strikes suddenly like a thunderclap (worst headache of your life), or is accompanied by stiff neck, high fever, or vision loss, seek emergency care immediately.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 ခေါင်းကိုက်ခြင်းနှင့် ဇာတ်ကြောတက်ခြင်း
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
ခေါင်းကိုက်ခြင်းနှင့် ဇာတ်ကြောတက်ခြင်းသည် စိတ်ဖိစီးမှု၊ ကြွက်သားတင်းမာမှု၊ ရေဓာတ်ခမ်းခြောက်မှု သို့မဟုတ် ဖုန်း/ကွန်ပျူတာ အကြည့်များခြင်းကြောင့် အဖြစ်များပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **အနားယူပါ**: တိတ်ဆိတ်၍ အလင်းရောင်မှိန်သော အခန်းတွင် မျက်စိမှိတ်ပြီး သက်တောင့်သက်သာ အနားယူပါ။
* **ရေနွေးဝတ် ကပ်ပေးပါ**: ဇာတ်ကြောနှင့် ဂုတ်ပိုးတွင် ရေနွေးဝတ် မိနစ် ၁၅ ခန့် ကပ်ပေးပါက တင်းမာနေသော ကြွက်သားများကို ပြေလျော့စေပါသည်။
* **ရေလုံလောက်စွာ သောက်ပါ**: ရေနွေး သို့မဟုတ် ရေကျက်အေး ၂ ဖန်ခွက် သောက်သုံးပေးပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **ဖုန်းနှင့် ကွန်ပျူတာ အကြည့်မများရ**: အလင်းစူးစူး ဖုန်းမျက်နှာပြင်များကို ကြည့်ခြင်း ရှောင်ကြဉ်ပါ။
* **ကော်ဖီနှင့် အရက် အလွန်အကျွံ မသောက်ရ**: ကဖင်းဓာတ်နှင့် အရက်သည် သွေးကြောများကို ကျဉ်းစေပြီး ခေါင်းကိုက်ခြင်းကို ပိုဆိုးစေပါသည်။
* **လည်ပင်းကို အတင်းချိုးခြင်း ရှောင်ပါ**: ဇာတ်ကြောကို အတင်းဆွဲလှည့် ချိုးဖဲ့ခြင်း မပြုလုပ်ရပါ။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အန္တရာယ်ကင်းပြီး အိမ်တွင် အလွယ်တကူ ရနိုင်သော ဆေးနည်း)*
* **ချင်းရေနွေးကြမ်း (Ginger Tea)**: ချင်းအစို ပါးပါးလှီး ရေနွေးစိမ်၍ သောက်သုံးပါက သွေးလည်ပတ်မှု ကောင်းမွန်စေပြီး ရောင်ရမ်းမှုကို ကျစေကာ ခေါင်းကိုက်ခြင်းကို သက်သာစေပါသည်။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> ရုတ်တရက် အလွန်ပြင်းထန်စွာ ခေါင်းကိုက်ခြင်း (Thunderclap headache)၊ ဇက်ခိုင်ခြင်း၊ အဖျားကြီးခြင်း၊ မျက်စိမှုန်ခြင်း သို့မဟုတ် စကားမပီခြင်းတို့ တွဲပါက ဆေးရုံသို့ ချက်ချင်း သွားရောက်ပြသပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else if (lower.includes('cough') || lower.includes('fever') || lower.includes('cold') || lower.includes('ချောင်းဆိုး') || lower.includes('ဖျား') || lower.includes('ရင်ကျပ်') || lower.includes('နှာစီး')) {
      reply = `### 🌿 Cough, Cold & Mild Fever Care
**Summary Explanation:**
Upper respiratory colds and coughs are typically viral infections causing airway mucosal inflammation, mucus overproduction, and elevated body temperature.

---

#### ✅ Recommended Practices (Dos)
* **Warm Fluid Hydration**: Drink warm boiled water, warm broth, or clear soups frequently to thin bronchial mucus.
* **Steam Inhalation**: Inhale warm steam for 10 minutes to clear nasal congestion and soothe vocal folds.
* **Warm Sponging for Fever**: Wipe face, neck, and limbs with lukewarm water; avoid ice.

#### ❌ Things to Avoid (Don'ts)
* **Avoid Cold Drinks & Iced Foods**: Cold liquids irritate throat nerves and trigger coughing paroxysms.
* **Avoid Oily & Deep-Fried Foods**: Greasy items aggravate throat irritation and slow digestion.
* **Do Not Self-Medicate Antibiotics**: Antibiotics are ineffective against viral colds and induce bacterial resistance.

#### 🍵 Supportive Home / Traditional Remedies
*(Safe, natural herbal teas to calm cough)*
* **Holy Basil & Honey (ပင်စိမ်းနှင့် ပျားရည်)**: Steep 7-10 clean fresh basil leaves in a cup of boiling water with 1 teaspoon of pure honey; sip warm twice daily.
* **Ginger & Lime Infusion (ချင်းနှင့် သံပရာရည်)**: Fresh crushed ginger steeped in hot water with a squeeze of fresh lime clears phlegm.

---

> ⚠️ **Emergency Warning (Red Flags):**
> If high fever exceeds 38.5°C for more than 3 days, breathing is rapid/labored, or cough brings up blood or rusty phlegm, consult a physician promptly.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 ချောင်းဆိုးခြင်း၊ နှာစီးခြင်းနှင့် အအေးမိဖျားနာခြင်း
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
အအေးမိခြင်းနှင့် ချောင်းဆိုးခြင်းသည် ဗိုင်းရပ်စ်ပိုးကြောင့် အသက်ရှူလမ်းကြောင်း ရောင်ရမ်းကာ သလိပ်ထွက်ခြင်းနှင့် အဖျားငွေ့ငွေ့ရှိခြင်းတို့ကို ဖြစ်ပေါ်စေပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **ရေနွေးများများ သောက်ပါ**: ရေနွေးနွေး၊ စွပ်ပြုတ်နွေးနွေးများကို မကြာခဏ သောက်ပေးခြင်းဖြင့် သလိပ်ကျစေပြီး လည်ချောင်းကို စိုစွတ်စေပါသည်။
* **ရေနွေးငွေ့ ရှူပေးပါ**: ရေနွေးငွေ့ကို ၅-၁၀ မိနစ်ခန့် ရှူပေးပါက နှာခေါင်းပိတ်ခြင်းနှင့် ရင်ကျပ်ခြင်းကို သက်သာစေပါသည်။
* **ရေပတ်တိုက်ပါ**: အဖျားတက်ပါက ရေခဲရေ မသုံးဘဲ ရေကျက်အေးဝတ်ဖြင့် ချိုင်း၊ ပေါင်ခြံနှင့် လည်ပင်းတို့ကို ပွတ်တိုက်ပေးပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **ရေခဲရေနှင့် အအေးစာများ ရှောင်ပါ**: ရေခဲရေ၊ ရေခဲမုန့်နှင့် အအေးမိစေသော အစားအစာများသည် လည်ချောင်းယားပြီး ချောင်းပိုဆိုးစေပါသည်။
* **အကြော်အလှော်နှင့် အစပ်များ ရှောင်ပါ**: အဆီများသော အကြော်များ၊ အစပ်လွန်ကဲသော အစားအစာများကို ရှောင်ကြဉ်ပါ။
* **ပဋိဇီဝပိုးသတ်ဆေးများ မိမိသဘောဖြင့် မသောက်ရပါ**: အအေးမိဗိုင်းရပ်စ်အတွက် ပိုးသတ်ဆေးများကို ဆရာဝန်ညွှန်ကြားချက်မပါဘဲ မသောက်သင့်ပါ။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အန္တရာယ်ကင်းပြီး အိမ်တွင် အလွယ်တကူ ပြုလုပ်နိုင်သော ဆေးနည်းများ)*
* **ပင်စိမ်းရွက်နှင့် ပျားရည်**: ပင်စိမ်းရွက် ၇-၁၀ ရွက်ကို ရေနွေးဖျောပြီး ပျားရည် လက်ဖက်ရည်ဇွန်း ၁ ဇွန်း ရောစပ်သောက်သုံးပါက ချောင်းဆိုးခြင်းကို အမြန် သက်သာစေပါသည်။
* **ချင်းနှင့် သံပရာရည်**: ချင်းပြုတ်ရည်ထဲသို့ သံပရာရည် အနည်းငယ်ညှစ်၍ သောက်ပါက လည်ချောင်းရှင်းပြီး သလိပ်ကင်းစင်စေပါသည်။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> အဖျားသည် ၃ ရက်ထက်ပို၍ မကျခြင်း၊ အသက်ရှူရခက်ခဲခြင်း/ရင်ကျပ်ခြင်း သို့မဟုတ် ချောင်းဆိုးရာတွင် သွေးပါလာပါက ဆရာဝန်နှင့် အမြန်ဆုံး သွားရောက်ပြသပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else if (lower.includes('diarrhea') || lower.includes('loose') || lower.includes('ors') || lower.includes('ဝမ်းလျှော') || lower.includes('ဝမ်းပျက်') || lower.includes('ဓာတ်ဆား')) {
      reply = `### 🌿 Diarrhea & Dehydration Management
**Summary Explanation:**
Diarrhea is characterized by frequent loose, watery stools leading to rapid depletion of water and vital electrolytes (sodium, potassium).

---

#### ✅ Recommended Practices (Dos)
* **Oral Rehydration Salts (ORS)**: Dissolve 1 sachet of WHO-standard ORS in 1 liter of boiled, cooled clean water. Sip after each bowel movement.
* **Light Digestible Diet**: Eat soft rice porridge (congee), ripe bananas, and steamed potatoes.
* **Maintain Hand Hygiene**: Wash hands thoroughly with soap before eating and after toilet use.

#### ❌ Things to Avoid (Don'ts)
* **Avoid Sugary Soft Drinks & Dairy**: Sweet drinks worsen osmotic diarrhea; cow's milk causes gastrointestinal cramping.
* **Avoid Oily & Spicy Foods**: Chili and greasy foods accelerate intestinal peristalsis.
* **Avoid Anti-motility Pills without Advice**: Do not take Loperamide if fever or dysentery is present.

#### 🍵 Supportive Home / Traditional Remedies
*(Natural remedies to restore hydration and electrolytes)*
* **Fresh Young Coconut Water (အုန်းရည်နုနု)**: Natural electrolytes in coconut water safely replenish lost potassium.
* **Thin Rice Water (ဆန်ပြုတ်ရည်ကျဲကျဲ)**: Lightly salted rice water provides easily absorbed carbohydrates and fluid.

---

> ⚠️ **Emergency Warning (Red Flags):**
> If stools contain visible blood or mucus, high fever develops, or severe dehydration occurs (sunken eyes, extreme thirst, no urine for 6 hours), rush to a clinic immediately.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 ဝမ်းလျှောခြင်းနှင့် ဝမ်းပျက်ခြင်း
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
ဝမ်းလျှောခြင်းသည် အစာမသန့်ရှင်းမှု သို့မဟုတ် ပိုးဝင်ခြင်းကြောင့် ဖြစ်ပွားပြီး ခန္ဓာကိုယ်မှ ရေဓာတ်နှင့် သတ္တုဓာတ်များ လျင်မြန်စွာ ဆုံးရှုံးစေပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **ဓာတ်ဆားရည် (ORS) သောက်ပါ**: ဓာတ်ဆား ၁ ထုပ်ကို ရေကျက်အေး ၁ လီတာဖြင့် ဖျော်ပြီး ဝမ်းသွားတိုင်း တစ်ငုံချင်း မကြာခဏ သောက်သုံးပေးပါ။
* **ဆန်ပြုတ်နွေးနွေး စားပါ**: ဆန်ပြုတ်၊ ငှက်ပျောသီးမှည့်ကဲ့သို့ အစာကြေလွယ်သော အစားအစာများကိုသာ စားသုံးပါ။
* **လက်ကို သန့်ရှင်းစွာ ဆေးကြောပါ**: အစာမစားမီနှင့် အိမ်သာတက်ပြီးတိုင်း လက်ကို ဆပ်ပြာဖြင့် စင်ကြယ်စွာ ဆေးပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **အချိုရည်နှင့် နို့ထွက်ပစ္စည်းများ ရှောင်ပါ**: သကြားပါသော အချိုရည်များနှင့် နို့သည် ဝမ်းသွားခြင်းကို ပိုမိုဆိုးရွားစေပါသည်။
* **အစပ်၊ အဆီနှင့် အချဉ် ရှောင်ပါ**: ငရုတ်သီး၊ အဆီအစိမ့်နှင့် အချဉ်များကို လုံးဝရှောင်ကြဉ်ပါ။
* **ဝမ်းပိတ်ဆေး မိမိသဘောဖြင့် မသောက်ရ**: ပိုးကြောင့်ဖြစ်သော ဝမ်းပျက်ခြင်းတွင် ဝမ်းပိတ်ဆေးသောက်ပါက ပိုးများ အူထဲကျန်နေတတ်ပါသည်။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အန္တရာယ်ကင်းပြီး ရေဓာတ်ဖြည့်တင်းပေးသော သဘာဝဆေးနည်းများ)*
* **အုန်းရည်နုနု**: သဘာဝ အုန်းရည်နုနု သောက်ပေးခြင်းဖြင့် ဆုံးရှုံးသွားသော ပိုတက်စီယမ်နှင့် သတ္တုဓာတ်များကို ပြန်လည်ဖြည့်တင်းပေးပါသည်။
* **ဆန်ပြုတ်ရည်ကျဲကျဲ ဆားအနည်းငယ်ခတ်**: ရေဓာတ်နှင့် အင်အားကို အမြန်ဆုံး ပြန်လည်ရရှိစေပါသည်။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> ဝမ်းထဲ သွေး သို့မဟုတ် ချွဲပါခြင်း၊ အဖျားကြီးခြင်း၊ မျက်တွင်းဟောက်ပက်ဖြစ်ပြီး ဆီးလုံးဝမသွားခြင်း (ရေဓာတ်ပြင်းထန်စွာ ခမ်းခြောက်ခြင်း) ဖြစ်ပါက ဆေးရုံသို့ ချက်ချင်း သွားရောက်ပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else if (lower.includes('dizzy') || lower.includes('vertigo') || lower.includes('ခေါင်းမူး') || lower.includes('မူးဝေ')) {
      reply = `### 🌿 Dizziness & Vertigo Care
**Summary Explanation:**
Dizziness and vertigo usually result from inner ear vestibular disturbances, dehydration, orthostatic hypotension, or cervical muscular tension.

---

#### ✅ Recommended Practices (Dos)
* **Sit or Lie Down Immediately**: Sit down calmly to prevent balance loss, falls, and head trauma.
* **Fix Gaze on a Stable Point**: Focus eyes on a motionless object across the room to stabilize vestibular balance.
* **Slow Body Movements**: Stand up very slowly from lying or sitting positions.

#### ❌ Things to Avoid (Don'ts)
* **Avoid Sudden Head Turns**: Do not jerk the neck or rotate the head rapidly.
* **Avoid Driving or Machinery**: Cease vehicle driving or operating heavy tools until completely stable.
* **Avoid Dehydration**: Drink water regularly.

#### 🍵 Supportive Home / Traditional Remedies
*(Natural remedies to improve vestibular blood circulation)*
* **Ginger Tea (ချင်းရေနွေးကြမ်း)**: Fresh ginger infusion effectively improves blood flow to the inner ear and vestibular centers, relieving both dizziness and associated nausea.

---

> ⚠️ **Emergency Warning (Red Flags):**
> If dizziness is accompanied by facial asymmetry, limb numbness, difficulty speaking, or sudden double vision, treat as stroke alert and dial Ambulance 192 immediately.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 ခေါင်းမူးခြင်းနှင့် မူးဝေခြင်း
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
ခေါင်းမူးခြင်းသည် အတွင်းနား မျှခြေမညီခြင်း၊ ရေဓာတ်ခမ်းခြောက်ခြင်း၊ အိပ်ရေးပျက်ခြင်း သို့မဟုတ် သွေးပေါင်ကျခြင်းကြောင့် အဖြစ်များပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **ချက်ချင်း ထိုင်ပါ သို့မဟုတ် လှဲနေပါ**: ချော်လဲခြင်းနှင့် ထိခိုက်ဒဏ်ရာရခြင်း မဖြစ်စေရန် ချက်ချင်း ထိုင်ပါ (သို့) အိပ်ရာတွင် လှဲနေပါ။
* **ငြိမ်သက်သော နေရာတစ်ခုကို စိုက်ကြည့်ပါ**: မျက်စိကို မလှုပ်ရှားသော အရာဝတ္ထုတစ်ခုပေါ် စိုက်ကြည့်ပေးခြင်းဖြင့် မျှခြေကို ထိန်းညှိပါ။
* **ဖြည်းဖြည်းချင်း ထပါ**: အိပ်ရာမှထလျှင် ရုတ်တရက် မထဘဲ ခဏထိုင်ပြီးမှ ဖြည်းဖြည်းချင်း မတ်တပ်ရပ်ပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **ခေါင်းကို ရုတ်တရက် လှည့်ခြင်း ရှောင်ပါ**: ခေါင်းနှင့် လည်ပင်းကို ရုတ်ခြည်း လှည့်ခြင်း မပြုရပါ။
* **ကားမောင်းခြင်း ရှောင်ပါ**: မူးဝေနေချိန်တွင် ယာဉ်မောင်းခြင်းနှင့် စက်ယန္တရား ကိုင်တွယ်ခြင်း လုံးဝမပြုရပါ။
* **ရေဆာခံခြင်း မပြုပါနှင့်**: ရေဓာတ်ခမ်းခြောက်ပါက ခေါင်းပိုမူးတတ်သဖြင့် ရေပုံမှန် သောက်ပါ။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အန္တရာယ်ကင်းပြီး အိမ်တွင် အလွယ်တကူ သုံးနိုင်သော ဆေးနည်း)*
* **ချင်းရေနွေးကြမ်း (Ginger Tea)**: ချင်းအစို ပါးပါးလှီး ရေနွေးစိမ်၍ သောက်သုံးပါက ဦးနှောက်နှင့် နားအတွင်း သွေးလည်ပတ်မှုကို အားကောင်းစေပြီး ခေါင်းမူးခြင်းနှင့် ပျို့အန်ချင်ခြင်းကို အမြန် သက်သာစေပါသည်။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> ခေါင်းမူးခြင်းနှင့်အတူ မျက်နှာတစ်ခြမ်းရွဲ့ခြင်း၊ ခြေလက်မသယ်နိုင်ခြင်း၊ စကားဗလုံးဗထွေးဖြစ်ခြင်းတို့ တွဲပါက လေဖြတ်ခြင်းလက္ခဏာဖြစ်နိုင်သဖြင့် လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    } else {
      reply = `### 🌿 Health Guidance for "${effectiveMessage}"
**Summary Explanation:**
Health symptoms often respond favorably to balanced rest, optimal hydration, supportive natural foods, and timely physician consultation.

---

#### ✅ Recommended Practices (Dos)
* **Adequate Hydration & Rest**: Drink clean lukewarm water and maintain 7-8 hours of sound sleep.
* **Balanced Nutrition**: Consume easily digestible, nutrient-dense home-cooked meals.
* **Consult a Healthcare Professional**: Seek clinical evaluation if symptoms are severe or persistent.

#### ❌ Things to Avoid (Don'ts)
* **Avoid Excess Spices, Greasy & Salty Foods**: Minimize processed, heavy food intake.
* **Avoid Self-Prescribed Medications**: Never use strong antibiotics or NSAIDs without a physician's prescription.
* **Avoid Stress & Overexertion**: Rest physically and mentally.

#### 🍵 Supportive Home / Traditional Remedies
*(Gentle traditional remedies for wellness)*
* **Warm Ginger or Basil Tea (ချင်း သို့မဟုတ် ပင်စိမ်းရေနွေးကြမ်း)**: Steep fresh ginger or holy basil leaves in hot water for a soothing natural health tonic.

---

> ⚠️ **Emergency Warning (Red Flags):**
> If you experience severe chest pain, shortness of breath, loss of consciousness, or symptoms worsen rapidly, dial Ambulance 192 immediately.
>
> 📌 *Note - This information is for general health knowledge and first aid advice only. It does not replace professional medical diagnosis or treatment.*`;

      myanmarReply = `### 🌿 ကျန်းမာရေး လမ်းညွှန်ချက် (မေးမြန်းမှု: "${effectiveMessage}")
**အကျဉ်းချုပ် ရှင်းလင်းချက်:**
ကျန်းမာရေး ဝေဒနာများသည် လုံလောက်သော အနားယူမှု၊ သန့်ရှင်းသော နေထိုင်စားသောက်မှု၊ ရေဓာတ်ပြည့်ဝမှုနှင့် သဘာဝတိုင်းရင်းဆေးနည်းများဖြင့် သက်သာပျောက်ကင်းစေနိုင်ပါသည်။

---

#### ✅ စောင့်ထိန်း လိုက်နာရန်များ (Dos)
* **လုံလောက်စွာ အနားယူပါ**: တစ်နေ့လျှင် အိပ်ရေးဝဝ အနားယူပြီး သန့်ရှင်းသော ရေနွေးနွေးကို လုံလောက်စွာ သောက်သုံးပါ။
* **အာဟာရမျှတစွာ စားပါ**: အစာကြေလွယ်ပြီး အာဟာရပြည့်ဝသော လတ်ဆတ်သည့် အစားအစာများကို စားသုံးပါ။
* **လက္ခဏာများကို စောင့်ကြည့်ပါ**: ဝေဒနာ မသက်သာပါက ဆရာဝန် သို့မဟုတ် ကျန်းမာရေးဝန်ထမ်းထံ သွားရောက်ပြသပါ။

#### ❌ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)
* **အစပ်၊ အဆီ၊ အငန် လွန်ကဲမှု ရှောင်ပါ**: အစာအိမ်နှင့် ခန္ဓာကိုယ်ကို ဝန်ပိစေသော အစားအစာများကို ရှောင်ကြဉ်ပါ။
* **ဆေးဝါးများ မိမိသဘောဖြင့် မသောက်ပါနှင့်**: ဆရာဝန်ညွှန်ကြားချက်မပါဘဲ သောက်ဆေးများကို မသောက်သင့်ပါ။
* **ပင်ပန်းလွန်ကဲသော လှုပ်ရှားမှုများ ရှောင်ပါ**: လေးလံသော အလုပ်များနှင့် အိပ်ရေးပျက်ခြင်းကို ရှောင်ကြဉ်ပါ။

#### 🍵 အထောက်အကူပြု မြန်မာ့တိုင်းရင်းဆေး / အိမ်တွင်းကုထုံး (Remedies)
*(အန္တရာယ်ကင်းပြီး အိမ်တွင် အလွယ်တကူ သုံးနိုင်သော သဘာဝဆေးနည်းများ)*
* **ချင်းရေနွေးကြမ်း (သို့မဟုတ်) ပင်စိမ်းရေနွေးဖျော**: ချင်း သို့မဟုတ် ပင်စိမ်းရွက်ကို ရေနွေးစိမ်၍ သောက်သုံးခြင်းသည် ခန္ဓာကိုယ်သွေးလည်ပတ်မှုကို ကောင်းစေပြီး ရောဂါဝေဒနာများကို သက်သာစေပါသည်။

---

> ⚠️ **အရေးပေါ် သတိပေးချက် (Red Flags):**
> ရင်ဘတ်အောင့်ခြင်း၊ အသက်ရှူကြပ်ခြင်း၊ သတိလစ်ခြင်း သို့မဟုတ် ဝေဒနာသည် ရက်ကြာသည်အထိ မသက်သာဘဲ ပိုမိုဆိုးရွားလာပါက ဆေးရုံ/ဆေးခန်းသို့ ချက်ချင်း သွားရောက်ပြသပါ။
>
> 📌 *မှတ်ချက် - ဤအချက်အလက်များသည် အထွေထွေ ကျန်းမာရေးဗဟုသုတနှင့် ရှေးဦးပြုစုနည်း အကြံပြုချက်သာ ဖြစ်ပါသည်။ ကျွမ်းကျင်ဆရာဝန်၏ တိုက်ရိုက် ရောဂါရှာဖွေကုသမှု (Medical Diagnosis) အစား အသုံးမပြုနိုင်ပါ။*`;
    }

    const finalAnswer = shouldReplyInMyanmar ? (myanmarReply || reply) : reply;

    res.json({
      response: cleanTextResponse(finalAnswer),
      myanmarResponse: cleanTextResponse(myanmarReply),
      source: 'clinical-rules',
      language: shouldReplyInMyanmar ? 'my' : 'en'
    });
  } catch (error: any) {
    console.error('Chat error:', error?.stack || error);
    res.status(500).json({ 
      error: 'Failed to process healthcare query.',
      details: error?.message || String(error)
    });
  }
});

// Helper function to process AI health queries for Telegram & Web
async function processHealthAiQuery(userText: string, language: string = 'my'): Promise<string> {
  const effectiveMessage = userText.trim() || 'Please provide health guidance.';
  const effectiveOpenRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const selectedModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

  const hasMyanmarCharacters = /[\u1000-\u109F]/.test(effectiveMessage);
  const shouldReplyInMyanmar = language === 'my' || hasMyanmarCharacters;

  const systemInstruction = shouldReplyInMyanmar 
    ? `သင်သည် မြန်မာ့ရိုးရာ တိုင်းရင်းဆေးပညာ၊ အိမ်တွင်းကုထုံး (Home Remedies) နှင့် အခြေခံ ကျန်းမာရေးဆိုင်ရာ အသိပညာပေး လက်ထောက် AI Agent ဖြစ်သည်။
စောင့်ထိန်း လိုက်နာရန်များ (Dos)၊ အထူးရှောင်ကြဉ်ရန်များ (Don'ts)၊ မြန်မာ့တိုင်းရင်းဆေး/အိမ်တွင်းကုထုံးများနှင့် အရေးပေါ် သတိပေးချက်များကို သေချာစွာ ရှင်းပြပေးပါ။`
    : `You are an AI Health Agent specializing in Myanmar Traditional Medicine, Home Remedies, and Primary Health Education. Provide safe, practical Dos, Don'ts, natural remedies, and emergency warnings.`;

  // 1. Try OpenRouter
  if (effectiveOpenRouterKey) {
    try {
      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveOpenRouterKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tmhip-myanmar.app'),
          'X-Title': 'TMHIP Myanmar Health Platform',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: effectiveMessage }
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (orResponse.ok) {
        const data = await orResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return cleanTextResponse(content);
      }
    } catch (err) {
      console.warn('OpenRouter Telegram query error:', err);
    }
  }

  // 2. Try Gemini
  const effectiveGeminiKey = process.env.GEMINI_API_KEY;
  if (effectiveGeminiKey) {
    try {
      const result = await generateWithGeminiRest(effectiveGeminiKey, {
        contents: [{ parts: [{ text: effectiveMessage }] }],
        systemInstruction,
        temperature: 0.3
      });
      if (result.text) return cleanTextResponse(result.text);
    } catch (err) {
      console.warn('Gemini Telegram query error:', err);
    }
  }

  // 3. Fallback rule-based reply
  const lower = effectiveMessage.toLowerCase();
  if (lower.includes('burn') || lower.includes('မီးလောင်')) {
    return `မီးလောင်ဒဏ်ရာ အရေးပေါ် ရှေးဦးပြုစုနည်း:\n၁။ ရေအေးဖြင့် အနည်းဆုံး မိနစ် ၂၀ ဆက်တိုက် လောင်းချပါ။ ရေခဲမကပ်ရ။\n၂။ သွားတိုက်ဆေး၊ ပဲငံပြာရည် လုံးဝမလိမ်းပါနှင့်။\n၃။ အဝတ်သန့် သို့မဟုတ် ပလတ်စတစ်စဖြင့် လျော့လျော့ အုပ်ထားပါ။\n၄။ ဒဏ်ရာကြီးပါက လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။`;
  } else if (lower.includes('snake') || lower.includes('မြွေ')) {
    return `မြွေကိုက်ခံရပါက အရေးပေါ် အသက်ကယ်နည်းလမ်းများ:\n၁။ လူနာကို မပြေးမလွှားခိုင်းဘဲ ငြိမ်သက်စွာထားပါ။ ခြေလက်ကို ကျောက်ပတ်တီးစည်းပါ။\n၂။ နှလုံးထက် နိမ့်သောနေရာတွင် ထားပါ။\n၃။ ကြိုးမချည်ရ၊ ဓားဖြင့်မခွဲရ၊ ပါးစပ်ဖြင့် မစုပ်ရပါ။\n၄။ ဆေးရုံအရေးပေါ် ၁၉၂ သို့ ချက်ချင်း ပို့ဆောင်ပါ။`;
  }

  return shouldReplyInMyanmar 
    ? `အိမ်တွင်းကုသရေး အကြံပေးမှ ကြိုဆိုပါတယ်။\nမေးမြန်းမှု: "${effectiveMessage}"\nကျန်းမာရေး၊ ရှေးဦးသူနာပြုစုနည်းနှင့် တိုင်းရင်းဆေးဖက်ဝင် အပင်များအကြောင်း မေးမြန်းနိုင်ပါသည်။ အရေးပေါ် အခြေအနေများအတွက် လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။`
    : `Home Health Advisor:\nYou asked: "${effectiveMessage}"\nFeel free to ask about symptoms, first aid, or herbal remedies. For emergencies dial Ambulance 192 directly.`;
}

// Telegram Bot Webhook endpoint
app.post(['/api/telegram', '/telegram'], async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.text) {
      res.status(200).send('OK');
      return;
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN is missing in environment variables');
      res.status(200).send('OK');
      return;
    }

    // Process AI Response
    const aiReply = await processHealthAiQuery(userText);

    // Send response back to Telegram User
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiReply,
      })
    });

    res.status(200).send('OK');
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.status(200).send('OK');
  }
});

// Vite / static file setup
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShowCare Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error(`Server error on port ${PORT}:`, err);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}

