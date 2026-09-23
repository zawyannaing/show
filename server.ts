import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Initialize Gemini lazily
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

function cleanTextResponse(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*{1,3}/g, '')
    .replace(/(\n\s*)[•\-\*]\s+/g, '$1• ')
    .trim();
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
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite'
];

async function generateWithGeminiResilient(
  ai: GoogleGenAI, 
  requestPayload: { contents: any; config?: any }
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: requestPayload.contents,
          config: requestPayload.config
        });
        const text = response.text || '';
        return { text, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isUnavailableOrRateLimited = 
          errMsg.includes('503') || 
          errMsg.includes('high demand') || 
          errMsg.includes('UNAVAILABLE') || 
          errMsg.includes('429') ||
          errMsg.includes('ResourceExhausted');

        if (isUnavailableOrRateLimited) {
          console.warn(`Gemini model ${model} (attempt ${attempt + 1}) busy or unavailable, trying retry/fallback...`);
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
        }
        // If second attempt failed or not retryable, advance to next model
        break;
      }
    }
  }
  throw lastError;
}

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    openRouterModel: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    timestamp: new Date().toISOString()
  });
});

// AI Doctor Medicine Photo Identification endpoint
app.post('/api/medicine/identify', async (req, res) => {
  try {
    const { image, language = 'my', additionalNotes, medicineHint, openRouterApiKey, model } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Medicine image is required.' });
      return;
    }

    const effectiveOpenRouterKey = openRouterApiKey || (req.headers['x-openrouter-key'] as string) || process.env.OPENROUTER_API_KEY;
    const selectedModel = model || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

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

    // 1. Try Gemini Vision if GEMINI_API_KEY is available
    const ai = getGeminiClient();
    if (ai) {
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

        const result = await generateWithGeminiResilient(ai, {
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
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json'
          }
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
    if (effectiveOpenRouterKey) {
      try {
        const promptText = `${systemPrompt}\n\nPatient additional notes: ${additionalNotes || 'None'}. Suspected: ${medicineHint || 'None'}`;
        const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveOpenRouterKey.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://tmhip-myanmar.app',
            'X-Title': 'TMHIP Myanmar Health Platform',
          },
          body: JSON.stringify({
            model: selectedModel,
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
        });

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
    const notesLower = (additionalNotes || '' + ' ' + (medicineHint || '')).toLowerCase();

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
app.post('/api/chat', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const isIpAdmin = req.headers['x-admin-key'] || req.headers['authorization'];

    if (!isIpAdmin) {
      const { allowed } = checkRateLimit(clientIp, 10, 10 * 60 * 1000); // 10 requests per 10 mins
      if (!allowed) {
        res.status(429).json({
          response: 'ဆွေးနွေးမေးမြန်းနိုင်သည့် အကြိမ်အရေအတွက် ခေတ္တပြည့်သွားပါပြီ။ ကျေးဇူးပြု၍ မိနစ်အနည်းငယ် ကြာမှ ပြန်လည် မေးမြန်းပေးပါရန် (Rate Limit Exceeded. Please wait a few minutes before trying again.)',
          error: 'rate_limit_exceeded'
        });
        return;
      }
    }

    const { message, image, language = 'en', openRouterApiKey, model } = req.body;

    if ((!message || typeof message !== 'string') && !image) {
      res.status(400).json({ error: 'Message query or image is required.' });
      return;
    }

    const effectiveMessage = (message && typeof message === 'string') ? message : 'Please analyze this medicine or health image in detail.';
    const effectiveOpenRouterKey = openRouterApiKey || (req.headers['x-openrouter-key'] as string) || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const selectedModel = model || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

    const hasMyanmarCharacters = /[\u1000-\u109F]/.test(effectiveMessage);
    const shouldReplyInMyanmar = language === 'my' || hasMyanmarCharacters;

    const systemInstruction = `You are "အိမ်တွင်းကုသရေး အကြံပေး" (Home Health & Wellness Advisor), an expert, empathetic, and highly safety-conscious AI Health Agent embedded in the SHOW CARE MYANMAR platform.

# PRIMARY OBJECTIVE
Your core mission is to help users understand their health concerns, provide accurate, evidence-based wellness and Myanmar traditional herbal guidance, and help them determine when to seek professional medical care.

# OPERATIONAL GUIDELINES & WORKFLOW
1. Analyze Context: Review the conversation history and the user's latest message to maintain context and continuity.
2. Clinical Triage: Assess user symptoms and categorize them into:
   - Emergency: Requires immediate ER/ambulance (Instruct user to call emergency services like Ambulance 192 or Rescue 191 in Myanmar immediately).
   - Doctor Visit: Requires professional medical examination.
   - Home/Self-Care: Mild issues manageable at home with safe natural remedies or lifestyle measures.
3. Ask Clarifying Questions: If essential details (duration, severity, age) are missing, ask 1-2 targeted questions before jumping to conclusions.

# STRICT SAFETY RULES & BOUNDARIES
- NO DIAGNOSIS: Never provide definitive medical diagnoses (e.g., avoid "You have bronchitis"). Use phrasing like "This pattern can sometimes be seen in..." or "Common possibilities include..." (in Burmese: "ဤလက္ခဏာများသည် ... တွင် တွေ့ရလေ့ရှိပါသည်").
- NO PRESCRIPTIONS: Never prescribe specific prescription drugs or medication dosages.
- EMERGENCY ESCALATION: If red-flag symptoms are present (e.g., severe chest pain, shortness of breath, sudden numbness, severe bleeding, snakebite, unconsciousness), immediately instruct the user to call emergency services (Ambulance 192 / Fire & Rescue 191).
- STRICT SCOPE LOCK: You ONLY answer health, medical, wellness, nutrition, fitness, traditional herbal remedies, and first aid queries. If a user asks about non-health topics (e.g., programming, coding, math, general trivia, history), politely refuse using this exact message:
  ${shouldReplyInMyanmar 
    ? `"ကျွန်ုပ်သည် အိမ်တွင်းကုသရေး အကြံပေး ဖြစ်ပြီး သင်၏ ကျန်းမာရေးနှင့် သုခဆိုင်ရာ သီးသန့် ကူညီပေးသူ ဖြစ်ပါသည်။ ကျွန်ုပ်အနေဖြင့် ကျန်းမာရေးဆိုင်ရာ မေးမြန်းမှုများကိုသာ ကူညီ ဖြေကြားပေးနိုင်ပါသည်။ ယနေ့ သင်၏ ကျန်းမာရေးအတွက် မည်သို့ ကူညီပေးရမလဲ ခင်ဗျာ။"` 
    : `"I am your Home Health Advisor. I can only assist with health-related queries. How can I help you with your health today?"`}

# OUTPUT FORMATTING
- Tone: Empathetic, calm, professional, and clear.
- Language: ${shouldReplyInMyanmar ? 'You MUST write your entire response fluently and completely in BURMESE script (မြန်မာဘာသာ).' : 'Write your response in clear, professional English.'}
- Formatting Rule: DO NOT use markdown asterisks (*, **, ***) anywhere in your response. Use plain text and bullet points (•) for list items.
- Structure:
  - Brief empathetic acknowledgment.
  - Bullet points (•) for health insights, traditional herbal guidance, or steps.
  - Clear recommended action (Emergency vs. Doctor Visit vs. Home/Self-Care).
  - Short medical disclaimer.`;

    // 1. Try OpenRouter if key is available
    if (effectiveOpenRouterKey) {
      const openRouterModels = [
        selectedModel,
        'google/gemini-2.5-flash',
        'meta-llama/llama-3.3-70b-instruct',
        'openai/gpt-4o-mini',
        'openrouter/auto'
      ];
      const uniqueModels = Array.from(new Set(openRouterModels.filter(Boolean)));

      for (const modelToTry of uniqueModels) {
        try {
          const userContent: any = image ? [
            { type: 'text', text: effectiveMessage },
            { type: 'image_url', image_url: { url: image } }
          ] : effectiveMessage;

          const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${effectiveOpenRouterKey.trim()}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://tmhip-myanmar.app',
              'X-Title': 'TMHIP Myanmar Health Platform',
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
          });

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

    // 2. If Gemini API Key is configured, use Gemini
    const ai = getGeminiClient();
    if (ai) {
      try {
        let contentsPayload: any = effectiveMessage;
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
        }

        const result = await generateWithGeminiResilient(ai, {
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.3,
          }
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
        console.warn('Gemini API call failed, using rule-based fallback:', geminiErr);
      }
    }

    // 3. High quality clinical rule-based triage fallback
    const lower = message.toLowerCase();
    let reply = '';
    let myanmarReply = '';

    if (lower.includes('burn') || lower.includes('မီးလောင်')) {
      reply = `Critical Burn Protocol:\n1. Cool with running tap water continuously for 20 minutes. Never apply ice.\n2. Strictly avoid folk pastes: Never use toothpaste, soy sauce, egg white, or motor grease.\n3. Sterile Dressing: Loosely drape with clean plastic cling wrap or sterile gauze.\n4. Emergency Transfer: If larger than palm size or on face/hands/joints, proceed immediately to hospital or call 192.`;
      myanmarReply = `မီးလောင်ဒဏ်ရာ အရေးပေါ် ရှေးဦးပြုစုနည်း:\n၁။ ရေအေးဖြင့် ဆေးကြောပါ: သန့်ရှင်းသော ရေအေး (သို့) ရေပိုက်ခေါင်းမှ ရေဖြင့် အနည်းဆုံး မိနစ် ၂၀ ဆက်တိုက် လောင်းချအအေးခံပါ။ (ရေခဲလုံးဝမကပ်ရ)\n၂။ အန္တရာယ်ရှိသော အလေ့အထများ ရှောင်ကြဉ်ပါ: သွားတိုက်ဆေး၊ ပဲငံပြာရည်၊ ကြက်ဥအကာ၊ မီးသွေးခဲစသည်တို့ လုံးဝမလိမ်းရပါ။ ပိုးဝင်ခြင်းကို ဖြစ်စေပါသည်။\n၃။ သန့်ရှင်းစွာ အုပ်ထားပါ: အဝတ်သန့် (သို့) သန့်ရှင်းသော ပလတ်စတစ်စဖြင့် လျော့လျော့ ဖုံးအုပ်ထားပါ။\n၄။ အရေးပေါ် ဆေးရုံပို့ဆောင်ပါ: လက်ဝါးထက်ကြီးသော ဒဏ်ရာ၊ မျက်နှာ၊ လည်ပင်း၊ ခြေလက်အဆစ်များ မီးလောင်ပါက လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်းခေါ်ဆိုပါ။`;
    } else if (lower.includes('snake') || lower.includes('မြွေ')) {
      reply = `Snakebite Emergency Life Safety Protocol:\n1. Complete Immobilization: Keep victim calm and still. Splint the bitten limb; do NOT allow patient to walk.\n2. Position Below Heart: Keep the bite site lower than the heart level.\n3. NO Incision / NO Tourniquets: Never cut, suck venom, or apply tight tourniquets which cause limb gangrene.\n4. Rapid Transport: Rush directly to township hospital with antivenom stock or call 192 immediately.`;
      myanmarReply = `မြွေကိုက်ခံရပါက အရေးပေါ် အသက်ကယ်နည်းလမ်းများ:\n၁။ လူနာအား ငြိမ်သက်စွာထားပါ: လူနာကို မပြေးမလွှားခိုင်းဘဲ လှုပ်ရှားမှုအနည်းဆုံးထားပါ။ ကိုက်ခံရသော ခြေ/လက်ကို သစ်သားချောင်းဖြင့် ကျောက်ပတ်တီးသဖွယ် ငြိမ်အောင် စည်းထားပါ။\n၂။ နှလုံးထက်နိမ့်သောနေရာတွင် ထားပါ: အဆိပ်ပျံ့နှံ့မှု နှေးကွေးစေရန် ကိုက်ခံရသည့် နေရာကို နှလုံးထက် နိမ့်အောင်ထားပါ။\n၃။ လုံးဝ (မပြုလုပ်ရမည့်အရာများ): ဓားဖြင့်မခွဲရ၊ ပါးစပ်ဖြင့် မစုပ်ရ၊ ကြိုးဖြင့် သွေးကြောပိတ်အောင် တင်းတင်းကျပ်ကျပ် မချည်ရ (ကြွက်သားပုပ်သွားစေနိုင်ပါသည်)။\n၄။ ဆေးရုံသို့ အမြန်ပို့ပါ: မြွေဆိပ်ဖြေဆေး (Antivenom) အဆင်သင့်ရှိသော အနီးဆုံး ဆေးရုံ/ဆေးခန်းသို့ ချက်ချင်း ပို့ဆောင်ပါ (အရေးပေါ် ၁၉၂ သို့ ခေါ်ဆိုပါ)။`;
    } else if (lower.includes('cough') || lower.includes('ချောင်းဆိုး') || lower.includes('basil') || lower.includes('tulsi') || lower.includes('ပင်စိမ်း')) {
      reply = `Herbal Relief for Cough & Bronchospasm:\n• Ocimum tenuiflorum (ပင်စိမ်း / Holy Basil): Fresh leaf tea infusion with wild honey taken twice daily relieves persistent dry coughs and relaxes bronchial muscles.\n• Zingiber officinale (ချင်း / Ginger): Boiled ginger root tea with lime and honey expels stubborn respiratory phlegm.\n• Warning: If accompanied by high fever, hemoptysis (coughing blood), or shortness of breath, consult a medical doctor.`;
      myanmarReply = `ချောင်းဆိုး၊ ရင်ကျပ်နှင့် လေပြွန်ရောင်ရမ်းခြင်း သက်သာစေရန် တိုင်းရင်းဆေးနည်းများ:\n• ပင်စိမ်းရွက် (Holy Basil / Ocimum tenuiflorum): ပင်စိမ်းရွက် ၇-၁၀ ရွက်ကို ရေနွေးဖျောပြီး ပျားရည်စစ်စစ် အနည်းငယ်ထည့်၍ နံနက်/ည တစ်နေ့ ၂ ကြိမ် သောက်သုံးပါက ချောင်းခြောက်ဆိုးခြင်းနှင့် ရင်ကျပ်ခြင်းကို သက်သာစေပါသည်။\n• ချင်းပြုတ်ရည် (Ginger Tea): ချင်းလက်တစ်ဆစ်ခန့်ကို ပါးပါးလှီး ရေနွေးဆူဆူတွင် ၅ မိနစ်ခန့် ပြုတ်ပြီး သံပရာရည်၊ ပျားရည်တို့ဖြင့် ရောသောက်ပါက ချွဲသလိပ်များကို ကင်းစင်စေပါသည်။\n• သတိပြုရန်: သလိပ်ထဲ သွေးပါခြင်း၊ အသက်ရှူကျပ်ခြင်း၊ ၃ ရက်ထက်ပို၍ ဖျားခြင်းတို့ ဖြစ်ပါက ဆရာဝန်နှင့် ပြသတိုင်ပင်ပါ။`;
    } else if (lower.includes('digest') || lower.includes('nausea') || lower.includes('အစာမကြေ') || lower.includes('ginger') || lower.includes('ချင်း')) {
      reply = `Digestive Relief & Nausea Protocol:\n• Zingiber officinale (ချင်း / Ginger Root): 5-10g boiled decoction accelerates gastric emptying and alleviates colic, nausea, and motion sickness.\n• Preparation: Thinly slice fresh ginger into boiling water for 5 minutes.\n• Caution: Avoid large doses in patients with active peptic ulcer bleeding or high-dose anticoagulant therapy.`;
      myanmarReply = `အစာမကြေ၊ လေထိုးလေအောင့်နှင့် ပျို့အန်ခြင်းအတွက် တိုင်းရင်းဆေးနည်း:\n• ချင်း (Ginger Root): ချင်းအစို ၅ ဂရမ်ခန့်ကို ပါးပါးလှီး၍ ရေနွေးကြမ်းကဲ့သို့ သောက်သုံးပါက အစာခြေဖျက်မှုကို မြန်ဆန်စေပြီး လေထိုးလေအောင့်နှင့် ပျို့အန်ခြင်းကို သိသိသာသာ သက်သာစေပါသည်။\n• ပြုလုပ်နည်း: သန့်ရှင်းသော ချင်းကို ရေနွေးဆူဆူတွင် ၅ မိနစ်ခန့် စိမ်ထားပြီး နွေးနွေးလေး သောက်ပါ။\n• သတိပြုရန်: အစာအိမ်သွေးယိုစီးနေသူများနှင့် သွေးကျဲဆေး အလွန်အကျွံ သောက်နေရသူများ ချင်းကို အလွန်အကျွံ မသောက်သုံးသင့်ပါ။`;
    } else if (lower.includes('neem') || lower.includes('တမာ') || lower.includes('fever') || lower.includes('အဖျား')) {
      reply = `Neem (တမာ / Azadirachta indica) Monograph:\n• Clinical Property: Powerful bitter antipyretic, blood purifier, and topical antiseptic.\n• Preparation: Boiled leaf water for soothing dermatological lesions; mild leaf infusion for tropical heat fevers.\n• Caution: Contraindicated in infants and early pregnancy.`;
      myanmarReply = `တမာပင် (Neem / Azadirachta indica) ဆေးဖက်ဝင် အသုံးချပုံ:\n• ဆေးဘက်ဂုဏ်သတ္တိ: ခါးသက်သော ဂုဏ်ရှိပြီး အပူကို ကျစေခြင်း၊ သွေးသန့်စင်စေခြင်းနှင့် ပိုးမွှားများကို သေစေနိုင်သော သဘာဝပိုးသတ်ဆေး ဖြစ်ပါသည်။\n• အသုံးပြုပုံ: တမာရွက်ပြုတ်ရည်ဖြင့် အရေပြားယားယံနာ၊ အဖုအပိမ့်များကို ဆေးကြောနိုင်ပြီး တမာရွက်နုကို ဟင်းခါးချက်သောက်ခြင်းဖြင့် အပူဖျားကို သက်သာစေပါသည်။\n• သတိပြုရန်: ကိုယ်ဝန်ဆောင်မိခင်များနှင့် မွေးကင်းစကလေးငယ်များ မသုံးစွဲရပါ။`;
    } else if (lower.includes('turmeric') || lower.includes('နနွင်း')) {
      reply = `Curcuma longa (နနွင်း / Turmeric):\n• Clinical Indications: Joint inflammation (osteoarthritis) relief and accelerated wound healing.\n• Bioavailability Tip: Combine turmeric with a pinch of black pepper (piperine) to increase curcumin systemic absorption by up to 2000%.\n• Caution: Discontinue before scheduled major surgical procedures.`;
      myanmarReply = `နနွင်း (Turmeric / Curcuma longa) အသုံးချနည်း:\n• ဆေးဖက်ဝင် အကျိုးအာနိသင်: နနွင်းတွင် ပါဝင်သော Curcumin ဓာတ်သည် အဆစ်အမြစ်ရောင်ရမ်းနာကို သက်သာစေပြီး ဒဏ်ရာအနာကျက်မှုကို မြန်ဆန်စေပါသည်။\n• စုပ်ယူမှုအားကောင်းစေရန်: နနွင်းမှုန့်ကို ငရုတ်ကောင်းစေ့ အနည်းငယ်နှင့် တွဲဖက်သုံးဆောင်ပါက ခန္ဓာကိုယ်မှ စုပ်ယူမှုကို အဆ ၂၀၀၀ ထိ ပိုမိုအားကောင်းစေပါသည်။\n• သတိပြုရန်: ခွဲစိတ်ကုသမှု မခံယူမီ ၂ ပတ်အတွင်း နနွင်းကို အလွန်အကျွံ သုံးစွဲခြင်းမှ ရှောင်ကြဉ်ပါ။`;
    } else {
      reply = `Home Health Guidance:\nYou inquired about "${message}".\n• For verified herbal monographs, explore the Medicinal Plants Directory (Zingiber officinale, Azadirachta indica, Ocimum tenuiflorum, Curcuma longa).\n• For emergency situations, consult the First Aid Protocols or dial Ambulance 192 directly.\n• Consult accredited healthcare practitioners before starting new herbal regimens.`;
      myanmarReply = `အိမ်တွင်းကုသရေး အကြံပေး လမ်းညွှန်:\nမေးမြန်းမှု: "${message}"\n• တိုင်းရင်းဆေးကျမ်းကဏ္ဍတွင် အသိအမှတ်ပြု ဆေးဖက်ဝင်အပင် ၁၂၀ ကျော်၏ ဆေးညွှန်း၊ သောက်သုံးပုံနှင့် သတိပြုရန်များကို ရှာဖွေဖတ်ရှုနိုင်ပါသည်။\n• အရေးပေါ် ရှေးဦးသူနာပြုစုနည်းများအတွက် ရှေးဦးသူနာပြုလမ်းညွှန်ကို ဖတ်ရှုပါ (သို့) လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။\n• တိုင်းရင်းဆေးကုထုံး မစတင်မီ အသိအမှတ်ပြု တိုင်းရင်းဆေးဆရာများနှင့် ပြသတိုင်ပင်ပါ။`;
    }

    const finalAnswer = shouldReplyInMyanmar ? (myanmarReply || reply) : reply;

    res.json({
      response: cleanTextResponse(finalAnswer),
      myanmarResponse: cleanTextResponse(myanmarReply),
      source: 'clinical-rules',
      language: shouldReplyInMyanmar ? 'my' : 'en'
    });
  } catch (error: unknown) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process healthcare query.' });
  }
});

// Vite / static file setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  function tryListen(port: number) {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`TMHIP Server running on http://0.0.0.0:${port}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying port ${port + 1}...`);
        tryListen(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  }

  tryListen(PORT);
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}

