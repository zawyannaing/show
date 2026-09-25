import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Send, 
  Key, 
  Sparkles, 
  Languages, 
  AlertTriangle, 
  Check, 
  Copy, 
  SlidersHorizontal,
  HeartPulse,
  Pill,
  ShieldAlert,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Clock,
  Camera,
  UploadCloud,
  X,
  RefreshCw,
  ChevronRight,
  ThumbsUp,
  ArrowDown,
  ArrowUp,
  History as HistoryIcon
} from 'lucide-react';
import { ChatMessage, ChatSession, MedicineAnalysisResult } from '../types';
import { MedicineAnalysisCard } from './MedicineAnalysisCard';
import { DEFAULT_CONSULTATION_HISTORY } from '../data/consultationHistory';
import { cleanMarkdownText } from '../utils/cleanText';
import { useAuth } from '../hooks/useAuth';
import { getTopicSuggestions } from '../utils/suggestionHelper';

export interface StoredConsultation {
  id: string;
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  allMessages: ChatMessage[];
  title: string;
  query: string;
  responsePreview: string;
  timestamp: string;
  hasImage: boolean;
  isEmergencyAlert: boolean;
  medicineResult?: MedicineAnalysisResult | null;
}

export interface AssistantSectionProps {
  language: 'en' | 'my';
  initialPrompt?: string;
  history?: ChatMessage[];
  onSelectHistoryItem?: (item: ChatMessage) => void;
}

const STORAGE_KEY = 'tmhip_doctor_ai_sessions';
const ACTIVE_SESSION_KEY = 'tmhip_doctor_ai_active_id';

export const AssistantSection: React.FC<AssistantSectionProps> = ({ 
  language,
  initialPrompt,
  history = DEFAULT_CONSULTATION_HISTORY,
  onSelectHistoryItem
}) => {
  const { isAdmin } = useAuth();
  const [chatLanguage, setChatLanguage] = useState<'en' | 'my'>(language);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  
  // History Sidebar state & search (Collapsed by default so user sees search first)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'all' | 'stored' | 'sessions'>('all');
  const [revisitedConsultationTitle, setRevisitedConsultationTitle] = useState<string | null>(null);
  
  // Settings & Audio
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => {
    return localStorage.getItem('tmhip_openrouter_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('tmhip_openrouter_model') || 'google/gemini-2.5-flash';
  });
  const [showConfig, setShowConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Group stored chat messages from history prop into structured consultations
  const storedConsultations = useMemo<StoredConsultation[]>(() => {
    if (!history || history.length === 0) return [];

    const list: StoredConsultation[] = [];
    let currentUserMsg: ChatMessage | null = null;
    let currentBatch: ChatMessage[] = [];

    for (let i = 0; i < history.length; i++) {
      const msg = history[i];
      if (msg.sender === 'user') {
        if (currentUserMsg) {
          list.push({
            id: `consult-${currentUserMsg.id}`,
            userMessage: currentUserMsg,
            allMessages: currentBatch,
            title: currentUserMsg.text.length > 42 ? `${currentUserMsg.text.substring(0, 42)}...` : currentUserMsg.text,
            query: currentUserMsg.text,
            responsePreview: '',
            timestamp: currentUserMsg.timestamp,
            hasImage: Boolean(currentUserMsg.image),
            isEmergencyAlert: Boolean(currentUserMsg.isEmergencyAlert),
            medicineResult: currentUserMsg.medicineResult
          });
        }
        currentUserMsg = msg;
        currentBatch = [msg];
      } else if (msg.sender === 'assistant') {
        currentBatch.push(msg);
        const queryText = currentUserMsg ? currentUserMsg.text : (chatLanguage === 'my' ? 'ဆေးပညာ အကြံဉာဏ်' : 'Medical Consultation');
        list.push({
          id: `consult-${currentUserMsg ? currentUserMsg.id : msg.id}`,
          userMessage: currentUserMsg || undefined,
          assistantMessage: msg,
          allMessages: currentBatch,
          title: queryText.length > 42 ? `${queryText.substring(0, 42)}...` : queryText,
          query: queryText,
          responsePreview: msg.text.replace(/[*#_`]/g, '').substring(0, 95),
          timestamp: msg.timestamp || (currentUserMsg ? currentUserMsg.timestamp : ''),
          hasImage: Boolean((currentUserMsg && currentUserMsg.image) || msg.image),
          isEmergencyAlert: Boolean(msg.isEmergencyAlert),
          medicineResult: msg.medicineResult || (currentUserMsg && currentUserMsg.medicineResult)
        });
        currentUserMsg = null;
        currentBatch = [];
      }
    }

    if (currentUserMsg) {
      list.push({
        id: `consult-${currentUserMsg.id}`,
        userMessage: currentUserMsg,
        allMessages: currentBatch,
        title: currentUserMsg.text.length > 42 ? `${currentUserMsg.text.substring(0, 42)}...` : currentUserMsg.text,
        query: currentUserMsg.text,
        responsePreview: '',
        timestamp: currentUserMsg.timestamp,
        hasImage: Boolean(currentUserMsg.image),
        isEmergencyAlert: Boolean(currentUserMsg.isEmergencyAlert),
        medicineResult: currentUserMsg.medicineResult
      });
    }

    return list;
  }, [history, chatLanguage]);

  // Sessions state (persisted in localStorage)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse saved chat sessions', e);
      }
    }
    return [];
  });

  // Always start with a new consultation session when visiting Doctor AI to show search bar first
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return `session-${Date.now()}`;
  });

  // Active messages derived from current session, or welcome state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync language prop
  useEffect(() => {
    setChatLanguage(language);
  }, [language]);

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Could not save sessions to localStorage', e);
    }
  }, [sessions]);

  // Save active session id
  useEffect(() => {
    localStorage.setItem(ACTIVE_SESSION_KEY, currentSessionId);
  }, [currentSessionId]);

  // Load messages whenever currentSessionId changes or session data changes
  useEffect(() => {
    const existing = sessions.find((s) => s.id === currentSessionId);
    if (existing) {
      setMessages(existing.messages);
      setRevisitedConsultationTitle(null);
    } else if (currentSessionId.startsWith('revisited-')) {
      const consultId = currentSessionId.replace('revisited-', '');
      const consult = storedConsultations.find((c) => c.id === consultId);
      if (consult) {
        setMessages(consult.allMessages);
        setRevisitedConsultationTitle(consult.title);
      }
    } else {
      setMessages([]);
      setRevisitedConsultationTitle(null);
    }
  }, [currentSessionId, sessions, storedConsultations]);

  // If initialPrompt is passed, auto-fill or execute
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
    }
  }, [initialPrompt]);

  // Auto-scroll chat container
  useEffect(() => {
    if (!showScrollBottom) {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading, showScrollBottom]);

  // Scroll detection
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
  };

  // Remove attached image
  const handleRemoveImage = () => {
    setAttachedImage(null);
    setAttachedImageName(null);
  };

  // Start new consultation session
  const handleStartNewChat = () => {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setInput('');
    setAttachedImage(null);
    setAttachedImageName(null);
    setIsCameraMenuOpen(false);
  };

  // Switch to an existing session
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setInput('');
    setAttachedImage(null);
    setAttachedImageName(null);
    setIsCameraMenuOpen(false);
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      chatLanguage === 'my' 
        ? 'ဤဆွေးနွေးမှုမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?' 
        : 'Are you sure you want to delete this consultation history?'
    );
    if (!confirmed) return;

    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);

    if (currentSessionId === sessionId) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        handleStartNewChat();
      }
    }
  };

  // Clear all history
  const handleClearAllHistory = () => {
    const confirmed = window.confirm(
      chatLanguage === 'my' 
        ? 'ဆွေးနွေးမှုမှတ်တမ်းအားလုံးကို ဖျက်ရန် သေချာပါသလား?' 
        : 'Are you sure you want to clear all consultation history?'
    );
    if (!confirmed) return;

    setSessions([]);
    handleStartNewChat();
  };

  // Handle image files from upload or camera
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(chatLanguage === 'my' ? 'ဓာတ်ပုံဖိုင်သာ ရွေးချယ်ပေးပါ' : 'Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert(chatLanguage === 'my' ? 'ဓာတ်ပုံအရွယ်အစား ၂၀ မီဂါဘိုက်ထက် မကျော်ရပါ' : 'Image size must be less than 20MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAttachedImage(dataUrl);
      setAttachedImageName(file.name);
      setIsCameraMenuOpen(false);
      // Auto-focus prompt bar
      setTimeout(() => textareaRef.current?.focus(), 100);
    };
    reader.readAsDataURL(file);
  };

  // Quick preset sample medicines
  const sampleMedicines = [
    {
      id: 'amlodipine',
      nameEn: 'Amlodipine 5mg',
      nameMy: 'အမ်လိုဒီပင်း ၅ မီလီဂရမ် (သွေးတိုးကျဆေး)',
      tag: 'Blood Pressure / သွေးတိုးကျဆေး',
      hint: 'Amlodipine 5mg high blood pressure',
      color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
    },
    {
      id: 'paracetamol',
      nameEn: 'Paracetamol 500mg',
      nameMy: 'ပါရာစီတမော ၅၀၀ မီလီဂရမ် (အဖျား/အကိုက်)',
      tag: 'Pain & Fever / အဖျားပျောက်',
      hint: 'Paracetamol 500mg pain and fever',
      color: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
    },
    {
      id: 'metformin',
      nameEn: 'Metformin 500mg',
      nameMy: 'မက်ဖော်မင် ၅၀၀ မီလီဂရမ် (ဆီးချိုကျဆေး)',
      tag: 'Diabetes / ဆီးချိုထိန်း',
      hint: 'Metformin 500mg diabetes',
      color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
    },
    {
      id: 'omeprazole',
      nameEn: 'Omeprazole 20mg',
      nameMy: 'အိုမီပရာဇော ၂၀ မီလီဂရမ် (အစာအိမ်လေနာ)',
      tag: 'Gastric Acid / အစာအိမ်',
      hint: 'Omeprazole 20mg gastric acid',
      color: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
    },
    {
      id: 'burmese-herbal',
      nameEn: 'Burmese Herbal Carminative',
      nameMy: 'တိုင်းရင်းဆေး အမှတ် ၃၄ (လေဆေး)',
      tag: 'Traditional Herbal / တိုင်းရင်းဆေး',
      hint: 'Myanmar Traditional Medicine No 34 carminative',
      color: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300'
    }
  ];

  const handleSelectSampleMedicine = (sample: typeof sampleMedicines[0]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(sample.nameEn, 30, 90);
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      ctx.fillText(sample.tag, 30, 130);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.fillText('TMHIP Medicine Verification Sample', 30, 170);
    }
    const sampleUrl = canvas.toDataURL('image/jpeg');
    setAttachedImage(sampleUrl);
    setAttachedImageName(sample.nameEn);
    setIsCameraMenuOpen(false);

    // Auto-fill query
    const prompt = chatLanguage === 'my' 
      ? `ဤ ${sample.nameMy} ၏ အသုံးဝင်ပုံ၊ သောက်သုံးပုံနှင့် သတိပြုရန်များကို စစ်ဆေးပေးပါ`
      : `Please analyze this sample medicine: ${sample.nameEn} and explain how to take it.`;
    handleSendMessage(prompt, sampleUrl, sample.hint);
  };

  // Primary Send Message Action (Handles text + optional image)
  const handleSendMessage = async (textToSend?: string, imageToSend?: string, medicineHint?: string) => {
    const queryText = (textToSend !== undefined ? textToSend : input).trim();
    const photo = imageToSend !== undefined ? imageToSend : attachedImage;

    if (!queryText && !photo) return;
    if (loading) return;

    // Reset input states
    setInput('');
    setAttachedImage(null);
    setAttachedImageName(null);
    setIsCameraMenuOpen(false);
    setLoading(true);

    const isBurmese = chatLanguage === 'my' || /[\u1000-\u109F]/.test(queryText);
    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: queryText || (isBurmese ? 'ဆေးဝါးဓာတ်ပုံ စစ်ဆေးပေးပါ' : 'Please examine this medicine photo'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: photo || undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      let assistantMessage: ChatMessage;

      // Case 1: If an image is attached, call medicine identify endpoint for structured senior analysis
      if (photo) {
        try {
          const medRes = await fetch('/api/medicine/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: photo,
              language: chatLanguage,
              additionalNotes: queryText,
              medicineHint: medicineHint,
              openRouterApiKey: openRouterKey,
              model: selectedModel
            })
          });

          if (medRes.ok) {
            const medData: MedicineAnalysisResult = await medRes.json();
            const summaryText = isBurmese
              ? `**${medData.myanmarName || medData.medicineName}**\n\n${medData.myanmarPurpose || medData.purpose}\n\n**သောက်သုံးရန် ညွှန်ကြားချက်:** ${medData.myanmarTiming || medData.timing}\n\n**သက်ကြီးရွယ်အိုများ အထူးသတိပြုရန်:**\n${(medData.myanmarPrecautions || medData.precautions || []).map((p) => `• ${p}`).join('\n')}`
              : `**${medData.medicineName}** (${medData.genericName || ''})\n\n${medData.purpose}\n\n**Dosage & Timing:** ${medData.timing}\n\n**Precautions:**\n${(medData.precautions || []).map((p) => `• ${p}`).join('\n')}`;

            assistantMessage = {
              id: `assistant-${Date.now()}`,
              sender: 'assistant',
              text: summaryText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              medicineResult: medData,
              suggestions: getTopicSuggestions(medData.medicineName || medData.myanmarName || 'medicine', summaryText, isBurmese)
            };
          } else {
            throw new Error('Medicine identify returned error');
          }
        } catch (photoErr) {
          console.warn('Medicine identify fallback to chat:', photoErr);
          // Fallback to chat endpoint with image
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: queryText || 'Please examine this medicine image',
              image: photo,
              language: chatLanguage,
              openRouterApiKey: openRouterKey,
              model: selectedModel
            })
          });
          const chatData = await chatRes.json();
          assistantMessage = {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: chatData.response || (isBurmese ? 'ဆေးဝါးကို စစ်ဆေးပြီးပါပြီ။' : 'Medicine analyzed.'),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestions: getTopicSuggestions(queryText || 'medicine photo', chatData.response || '', isBurmese)
          };
        }
      } else {
        // Case 2: Clinical text consultation
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: queryText,
            language: chatLanguage,
            openRouterApiKey: openRouterKey,
            model: selectedModel
          }),
        });

        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        const isEmergency = 
          queryText.toLowerCase().includes('snake') || 
          queryText.includes('မြွေ') || 
          queryText.toLowerCase().includes('burn') || 
          queryText.includes('မီးလောင်') ||
          queryText.toLowerCase().includes('stroke') || 
          queryText.includes('လေဖြတ်') ||
          queryText.toLowerCase().includes('heart') || 
          queryText.includes('နှလုံး') ||
          queryText.includes('သတိလစ်');

        assistantMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isEmergencyAlert: isEmergency,
          suggestions: getTopicSuggestions(queryText, data.response || '', isBurmese)
        };
      }

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save/Update session in sessions list
      setSessions((prevSessions) => {
        const sessionTitle = queryText.length > 36 ? `${queryText.substring(0, 36)}...` : queryText || (isBurmese ? 'ဆေးဝါးဓာတ်ပုံ စစ်ဆေးမှု' : 'Medicine Photo Scan');
        const existingIndex = prevSessions.findIndex((s) => s.id === currentSessionId);
        
        const updatedSession: ChatSession = {
          id: currentSessionId,
          title: existingIndex >= 0 ? prevSessions[existingIndex].title : sessionTitle,
          preview: assistantMessage.text.substring(0, 70),
          createdAt: existingIndex >= 0 ? prevSessions[existingIndex].createdAt : Date.now(),
          updatedAt: Date.now(),
          hasImage: Boolean(photo || (existingIndex >= 0 && prevSessions[existingIndex].hasImage)),
          messages: updatedMessages
        };

        if (existingIndex >= 0) {
          const clone = [...prevSessions];
          clone[existingIndex] = updatedSession;
          return clone;
        } else {
          return [updatedSession, ...prevSessions];
        }
      });

    } catch (err) {
      console.warn('Network issue, using clinical emergency fallback', err);
      // Emergency rule-based fallback
      const lower = queryText.toLowerCase();
      let reply = '';
      if (lower.includes('burn') || queryText.includes('မီးလောင်')) {
        reply = isBurmese
          ? `**မီးလောင်ဒဏ်ရာ အရေးပေါ် ရှေးဦးပြုစုနည်း:**\n၁။ **ရေအေးဖြင့် ဆေးကြောပါ**: သန့်ရှင်းသော ရေအေးဖြင့် မိနစ် ၂၀ ဆက်တိုက် လောင်းချ အအေးခံပါ။ ရေခဲလုံးဝ မကပ်ရပါ။\n၂။ **သွားတိုက်ဆေး မလိမ်းရ**: သွားတိုက်ဆေး၊ ပဲငံပြာရည်၊ ကြက်ဥ လုံးဝမလိမ်းရပါ။\n၃။ **အဝတ်သန့် အုပ်ပါ**: သန့်ရှင်းသော အဝတ်သန့်ဖြင့် အုပ်ထားပါ။\n၄။ **အရေးပေါ် ဆေးရုံပို့ပါ**: ဒဏ်ရာကြီးပါက လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။`
          : `**Burn Emergency First Aid:**\n1. Cool with running clean water for 20 minutes continuously. Never apply ice.\n2. Do NOT apply toothpaste, soy sauce, or folk pastes.\n3. Cover loosely with sterile dressing.\n4. Call Emergency Ambulance 192 immediately for severe burns.`;
      } else if (lower.includes('snake') || queryText.includes('မြွေ')) {
        reply = isBurmese
          ? `**မြွေကိုက်ခံရပါက အရေးပေါ် အသက်ကယ်နည်း:**\n၁။ လူနာအား ငြိမ်သက်စွာထားပါ (မပြေးမလွှားရ)။\n၂။ ကိုက်ခံရသော ခြေလက်ကို ကျောက်ပတ်တီးသဖွယ် ငြိမ်အောင် စည်းထားပါ။\n၃။ နှလုံးထက် နိမ့်သောနေရာတွင် ထားပါ။\n၄။ ဓားဖြင့်မခွဲရ၊ ပါးစပ်ဖြင့် မစုပ်ရ၊ ကြိုးဖြင့် သွေးကြောပိတ်အောင် မချည်ရ။\n၅။ မြွေဆိပ်ဖြေဆေးရှိသော အနီးဆုံးဆေးရုံသို့ အမြန်ပို့ပါ (ဖုန်း ၁၉၂)။`
          : `**Snakebite Emergency Action:**\n1. Immobilize and splint the limb completely.\n2. Keep bite site below heart level.\n3. Do NOT cut, suck venom, or use tight tourniquets.\n4. Rush directly to hospital with antivenom stock (Dial 192).`;
      } else {
        reply = isBurmese
          ? `မေးမြန်းမှု "${queryText}" အတွက် အချက်အလက်များကို တိုင်းရင်းဆေးကျမ်းနှင့် ၄၀+ သက်ကြီးကျန်းမာရေးကဏ္ဍတွင် အသေးစိတ် ဖတ်ရှုနိုင်ပါသည်။ အရေးပေါ် အခြေအနေများအတွက် လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်းခေါ်ဆိုပါ။`
          : `For inquiry "${queryText}", please consult the Medicinal Plants Directory or 40+ Health Hub. Call Emergency Ambulance 192 for urgent life-safety support.`;
      }

      const fallbackMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: getTopicSuggestions(queryText, reply, isBurmese)
      };

      const fallbackList = [...newMessages, fallbackMsg];
      setMessages(fallbackList);

      setSessions((prevSessions) => {
        const sessionTitle = queryText.substring(0, 36) || (isBurmese ? 'ကျန်းမာရေး ဆွေးနွေးမှု' : 'Health Consult');
        return [
          {
            id: currentSessionId,
            title: sessionTitle,
            preview: reply.substring(0, 70),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: fallbackList
          },
          ...prevSessions.filter((s) => s.id !== currentSessionId)
        ];
      });
    } finally {
      setLoading(false);
    }
  };



  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered sessions based on History Search Query
  const filteredSessions = useMemo(() => {
    if (!historySearchQuery.trim()) return sessions;
    const query = historySearchQuery.toLowerCase();
    return sessions.filter((s) => 
      s.title.toLowerCase().includes(query) ||
      s.preview.toLowerCase().includes(query) ||
      s.messages.some((m) => m.text.toLowerCase().includes(query))
    );
  }, [sessions, historySearchQuery]);

  // Filtered stored consultations from history prop based on History Search Query
  const filteredStoredConsultations = useMemo(() => {
    if (!historySearchQuery.trim()) return storedConsultations;
    const query = historySearchQuery.toLowerCase();
    return storedConsultations.filter((c) => 
      c.title.toLowerCase().includes(query) ||
      c.query.toLowerCase().includes(query) ||
      c.responsePreview.toLowerCase().includes(query) ||
      c.allMessages.some((m) => m.text.toLowerCase().includes(query))
    );
  }, [storedConsultations, historySearchQuery]);

  // Revisit a stored consultation or message from history
  const handleRevisitConsultation = (consultation: StoredConsultation | ChatMessage) => {
    if ('allMessages' in consultation) {
      setCurrentSessionId(`revisited-${consultation.id}`);
      setMessages(consultation.allMessages);
      setRevisitedConsultationTitle(consultation.title);
      if (onSelectHistoryItem && consultation.allMessages[0]) {
        onSelectHistoryItem(consultation.allMessages[0]);
      }
    } else {
      const parent = storedConsultations.find((c) => c.allMessages.some((m) => m.id === consultation.id));
      if (parent) {
        setCurrentSessionId(`revisited-${parent.id}`);
        setMessages(parent.allMessages);
        setRevisitedConsultationTitle(parent.title);
      } else {
        setCurrentSessionId(`revisited-${consultation.id}`);
        setMessages([consultation]);
        setRevisitedConsultationTitle(consultation.text.substring(0, 36));
      }
      if (onSelectHistoryItem) {
        onSelectHistoryItem(consultation);
      }
    }

    setInput('');
    setAttachedImage(null);
    setAttachedImageName(null);
    setIsCameraMenuOpen(false);

    setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  // Curated 4 Gemini Bento Suggestion Cards
  const bentoCards = chatLanguage === 'my' ? [
    {
      icon: <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'ဆေးဝါးဓာတ်ပုံ စစ်ဆေးမည်',
      subtitle: 'ဆေးဘူး (သို့) ဆေးကတ် ဓာတ်ပုံရိုက်၍ ဆေးအမည်၊ သောက်သုံးပုံနှင့် သတိပြုရန်များ စစ်ဆေးပေးပါ',
      action: () => setIsCameraMenuOpen(true),
      badge: 'Photo Vision'
    },
    {
      icon: <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      title: '၄၀+ သွေးတိုး၊ ဆီးချို ထိန်းနည်း',
      subtitle: 'သွေးတိုး၊ ဆီးချို၊ အဆစ်ဒူးနာအတွက် တိုင်းရင်းဆေးနည်းများနှင့် သက်ကြီးနေထိုင်မှု လမ်းညွှန်',
      action: () => handleSendMessage('အသက် ၄၀ ကျော်များအတွက် သွေးတိုး၊ ဆီးချိုနှင့် အဆစ်အမြစ်ရောင် သက်သာစေမည့် တိုင်းရင်းဆေးနည်းများနှင့် နေထိုင်မှုပုံစံ ရှင်းပြပေးပါ'),
      badge: 'Senior 40+'
    },
    {
      icon: <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'မြန်မာ့ဆေးဖက်ဝင် အပင်များ',
      subtitle: 'ကြက်သွန်ဖြူ၊ တမာ၊ ပင်စိမ်း၊ နနွင်းတို့၏ သောက်သုံးရန် ဆေးပမာဏနှင့် အသုံးချနည်းများ',
      action: () => handleSendMessage('ကြက်သွန်ဖြူ၊ တမာရွက်၊ ပင်စိမ်းနှင့် နနွင်းတို့၏ ဆေးဖက်ဝင် အာနိသင်နှင့် စနစ်တကျ သောက်သုံးနည်းများ ရှင်းပြပါ'),
      badge: 'Herbal Care'
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      title: 'အရေးပေါ် ရှေးဦးပြုစုနည်း',
      subtitle: 'မီးလောင်ဒဏ်ရာ၊ မြွေကိုက်ခံရခြင်း၊ ရုတ်တရက် လေဖြတ်ခြင်း (FAST) အသက်ကယ် အဆင့်များ',
      action: () => handleSendMessage('ရုတ်တရက် လေဖြတ်ခြင်း FAST စစ်ဆေးနည်း၊ မီးလောင်ဒဏ်ရာနှင့် မြွေကိုက်ခံရပါက ချက်ချင်း လုပ်ဆောင်ရမည့် အသက်ကယ်နည်းများ ရှင်းပြပါ'),
      badge: 'First Aid'
    },
  ] : [
    {
      icon: <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Scan Medicine Photo',
      subtitle: 'Take a photo of any medicine bottle or blister pack for elderly instructions and cautions',
      action: () => setIsCameraMenuOpen(true),
      badge: 'Photo Vision'
    },
    {
      icon: <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      title: 'Senior 40+ Hypertension & Diabetes',
      subtitle: 'Evidence-based traditional herbs and lifestyle protocols for chronic cardiovascular care',
      action: () => handleSendMessage('What are evidence-based traditional herbal protocols for managing hypertension and type 2 diabetes in seniors?'),
      badge: 'Senior 40+'
    },
    {
      icon: <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'Myanmar Herbal Monographs',
      subtitle: 'Indications, preparation methods, and dosages for Garlic, Neem, Holy Basil, and Turmeric',
      action: () => handleSendMessage('Explain the standardized indications, preparation methods, and dosage for Holy Basil, Neem, and Turmeric in traditional medicine.'),
      badge: 'Herbal Care'
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      title: 'Emergency Life Safety & FAST',
      subtitle: 'Standardized protocols for acute stroke triage, venomous snakebites, and severe burns',
      action: () => handleSendMessage('What are the critical first aid protocols for acute stroke (FAST), thermal burns, and snakebites?'),
      badge: 'First Aid'
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-col transition-colors">
      
      {/* Hidden file & camera inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
      />

      {/* Main Gemini Shell Container */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[calc(100dvh-130px)] min-h-[580px] max-h-[920px]">
        
        {/* Gemini Top App Bar */}
        <div className="h-14 sm:h-16 px-3 sm:px-6 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sidebar Toggle Button for History Chat */}
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2 px-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5 border border-neutral-200/70 dark:border-neutral-700/70 text-xs font-medium"
              title={isSidebarOpen ? 'Hide consultation history' : 'Open consultation history'}
              type="button"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              <span className="font-myanmar hidden sm:inline">
                {chatLanguage === 'my' ? 'မှတ်တမ်း' : 'History'}
              </span>
              {(sessions.length > 0 || storedConsultations.length > 0) && (
                <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700 text-[10px] font-mono">
                  {sessions.length + storedConsultations.length}
                </span>
              )}
            </button>

            {/* Gemini Brand & Model Selector */}
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight font-myanmar">
                {chatLanguage === 'my' ? 'အိမ်တွင်းကုသမှုအကြံပေး' : 'Home Treatment Advisor'}
              </span>

              {/* Minimal Model Badge / Config Trigger (Admin Only) */}
              {isAdmin && (
                <button
                  onClick={() => setShowConfig((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70 text-neutral-600 dark:text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
                  title="Model Settings (Admin)"
                  type="button"
                >
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span className="text-[11px] font-mono">Gemini 2.5</span>
                  <SlidersHorizontal className="w-3 h-3 opacity-60" />
                </button>
              )}
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* New Chat Button */}
            <button
              onClick={handleStartNewChat}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer font-myanmar"
              type="button"
              title="Start new chat"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{chatLanguage === 'my' ? 'အသစ်' : 'New Chat'}</span>
            </button>

            {/* Myanmar / English Language Switcher */}
            <button
              onClick={() => setChatLanguage((prev) => (prev === 'en' ? 'my' : 'en'))}
              className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1 border border-neutral-200 dark:border-neutral-700"
              type="button"
              title="Toggle Myanmar / English"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{chatLanguage === 'my' ? 'မြန်မာ' : 'EN'}</span>
            </button>
          </div>
        </div>

        {/* AI Key Configuration Bar (Collapsible - Admin Only) */}
        {isAdmin && showConfig && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-150">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Admin OpenRouter Key Override (Optional)
                  </label>
                  <button 
                    onClick={() => setShowConfig(false)}
                    className="text-xs text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="password"
                  value={openRouterKey}
                  onChange={(e) => {
                    setOpenRouterKey(e.target.value);
                    localStorage.setItem('tmhip_openrouter_key', e.target.value);
                  }}
                  placeholder="sk-or-v1-..."
                  className="w-full px-3 py-1.5 rounded-lg text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white focus:outline-none"
                />
              </div>
              <div className="w-full sm:w-60">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    localStorage.setItem('tmhip_openrouter_model', e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white"
                >
                  <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Fast & Clinical)</option>
                  <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
                  <option value="deepseek/deepseek-chat">DeepSeek V3</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Gemini Body: History Sidebar + Main Chat Canvas */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* Left History Sidebar (Collapsible Gemini Layout) */}
          <aside
            className={`transition-all duration-300 ease-in-out border-r border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/80 flex flex-col z-20 ${
              isSidebarOpen 
                ? 'w-72 sm:w-80 shrink-0 translate-x-0' 
                : 'w-0 -translate-x-full overflow-hidden border-r-0'
            }`}
          >
            {/* Sidebar Action & Search */}
            <div className="p-3 border-b border-neutral-200/80 dark:border-neutral-800 space-y-2">
              <button
                onClick={handleStartNewChat}
                className="w-full py-2 px-3 rounded-full bg-neutral-200/70 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-900 dark:text-neutral-100 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer font-myanmar"
                type="button"
              >
                <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>{chatLanguage === 'my' ? 'ဆွေးနွေးမှုအသစ်' : 'New chat'}</span>
              </button>

              {/* Minimal Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder={chatLanguage === 'my' ? 'မှတ်တမ်းရှာဖွေရန်...' : 'Search past consultations...'}
                  className="w-full pl-8 pr-7 py-1.5 rounded-full text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 font-myanmar"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Sessions & Stored Consultations List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
              {/* STORED CONSULTATIONS (Mapped directly from history prop) */}
              {filteredStoredConsultations.length > 0 && (
                <div className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-myanmar flex items-center justify-between">
                    <span>{chatLanguage === 'my' ? 'သိမ်းဆည်းထားသော ဆေးဆွေးနွေးမှုများ' : 'Saved Consultations'}</span>
                    <span className="text-[10px]">{filteredStoredConsultations.length}</span>
                  </div>

                  {filteredStoredConsultations.map((consult) => {
                    const isActive = currentSessionId === `revisited-${consult.id}`;
                    return (
                      <div
                        key={consult.id}
                        onClick={() => handleRevisitConsultation(consult)}
                        className={`group px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                          isActive
                            ? 'bg-neutral-200/90 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                            : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs shrink-0">
                            {consult.medicineResult ? '💊' : consult.isEmergencyAlert ? '🚨' : '🩺'}
                          </span>
                          <span className="text-xs truncate font-myanmar">
                            {consult.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                          {consult.timestamp}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* RECENT BROWSER SESSIONS */}
              {filteredSessions.length > 0 && (
                <div className="space-y-0.5">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-myanmar flex items-center justify-between">
                    <span>{chatLanguage === 'my' ? 'လတ်တလော ဆွေးနွေးချက်များ' : 'Recent Chats'}</span>
                    <span className="text-[10px]">{filteredSessions.length}</span>
                  </div>

                  {filteredSessions.map((session) => {
                    const isActive = session.id === currentSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                          isActive
                            ? 'bg-neutral-200/90 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                            : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="text-xs truncate font-myanmar">
                            {session.title}
                          </span>
                        </div>

                        {/* Delete session button on hover */}
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-opacity cursor-pointer shrink-0"
                          title="Delete chat"
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {filteredStoredConsultations.length === 0 && filteredSessions.length === 0 && (
                <div className="p-6 text-center text-xs text-neutral-400 font-myanmar">
                  {historySearchQuery ? (
                    <div>
                      <p className="mb-1">{chatLanguage === 'my' ? 'ကိုက်ညီသော မှတ်တမ်း မရှိပါ' : 'No matching consultations'}</p>
                      <button 
                        onClick={() => setHistorySearchQuery('')}
                        className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        {chatLanguage === 'my' ? 'ရှာဖွေမှု ရှင်းလင်းပါ' : 'Clear search'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-30" />
                      <p>{chatLanguage === 'my' ? 'မှတ်တမ်း မရှိသေးပါ' : 'No past consultations'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Bottom Clear Action */}
            {sessions.length > 0 && (
              <div className="p-2.5 border-t border-neutral-200/80 dark:border-neutral-800 flex justify-end">
                <button
                  onClick={handleClearAllHistory}
                  className="text-neutral-400 hover:text-red-500 transition-colors font-myanmar flex items-center gap-1 text-[11px] cursor-pointer"
                  type="button"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{chatLanguage === 'my' ? 'မှတ်တမ်းအားလုံး ဖျက်မည်' : 'Clear history'}</span>
                </button>
              </div>
            )}
          </aside>

          {/* Main Chat Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/30 dark:bg-neutral-950/30 relative">
            
            {/* Messages Scroll Area */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth"
            >
              {/* If no messages in current session: Show Clean Gemini Welcome Screen */}
              {messages.length === 0 ? (
                <div className="max-w-2xl mx-auto py-10 sm:py-16 flex flex-col text-left sm:text-center animate-in fade-in duration-300">
                  {/* Gemini Sparkles Hero Icon */}
                  <div className="mb-4 sm:mb-6 flex sm:justify-center">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Clean Greeting */}
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight font-myanmar">
                    <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent font-extrabold">
                      {chatLanguage === 'my' ? 'အိမ်တွင်းကုသမှုအကြံပေး' : 'Home Treatment Advisor'}
                    </span>
                  </h1>
                  <p className="text-base sm:text-lg text-neutral-500 dark:text-neutral-400 mt-2 mb-6 font-myanmar font-normal">
                    {chatLanguage === 'my' ? 'ကျန်းမာရေးနှင့် ဆေးဝါးများအကြောင်း မေးမြန်းရန် ရှာဖွေပါ...' : 'Search medicines, symptoms, or ask health questions...'}
                  </p>

                  {/* PROMINENT DOCTOR AI SEARCH BAR */}
                  <div className="w-full mb-8 text-left">
                    {/* Camera / Sample Picker Popup Menu inside Search Bar view */}
                    {isCameraMenuOpen && (
                      <div className="mb-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl animate-in fade-in zoom-in-95 duration-150 font-myanmar">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-emerald-600" />
                            <span>{chatLanguage === 'my' ? 'ဆေးဝါးဓာတ်ပုံ စစ်ဆေးရန် ရွေးချယ်ပါ' : 'Capture or Upload Medicine Photo'}</span>
                          </span>
                          <button 
                            onClick={() => setIsCameraMenuOpen(false)}
                            className="text-xs text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                            type="button"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <button
                            onClick={() => cameraInputRef.current?.click()}
                            className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                            type="button"
                          >
                            <Camera className="w-5 h-5 text-emerald-600" />
                            <span>{chatLanguage === 'my' ? 'ကင်မရာဖြင့် ရိုက်မည်' : 'Take Photo'}</span>
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                            type="button"
                          >
                            <UploadCloud className="w-5 h-5 text-blue-600" />
                            <span>{chatLanguage === 'my' ? 'ဖုန်းထဲမှ ရွေးမည်' : 'Upload File'}</span>
                          </button>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 font-myanmar">
                            {chatLanguage === 'my' ? 'နမူနာဆေးဝါးများ စမ်းသပ်ရန် (၁-ချက်နှိပ်):' : 'Or try sample medicines (1-click test):'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {sampleMedicines.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => handleSelectSampleMedicine(m)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-myanmar transition-all hover:scale-102 cursor-pointer ${m.color}`}
                                type="button"
                              >
                                {chatLanguage === 'my' ? m.nameMy : m.nameEn}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Outer Search Box */}
                    <div className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 hover:border-blue-500/80 dark:hover:border-blue-400/80 focus-within:border-blue-600 dark:focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/15 shadow-sm transition-all p-2 sm:p-2.5">
                      {/* Attached Image Thumbnail */}
                      {attachedImage && (
                        <div className="mb-2 p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between gap-2 border border-neutral-200 dark:border-neutral-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <img 
                              src={attachedImage} 
                              alt="Attached medicine preview" 
                              className="w-10 h-10 object-cover rounded-lg border border-neutral-300 dark:border-neutral-600 shrink-0" 
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate font-myanmar">
                                {attachedImageName || (chatLanguage === 'my' ? 'ဆေးဝါးဓာတ်ပုံ' : 'Attached Photo')}
                              </p>
                              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-myanmar">
                                {chatLanguage === 'my' ? 'ဆေးဝါးစစ်ဆေးရန် အသင့်ဖြစ်ပါပြီ' : 'Ready to analyze'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleRemoveImage}
                            className="p-1.5 rounded-full text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer shrink-0"
                            title="Remove photo"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Main Search Input Row */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="pl-2 text-blue-600 dark:text-blue-400 shrink-0">
                          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>

                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder={
                            attachedImage
                              ? (chatLanguage === 'my' ? 'ဤဆေးဝါးအကြောင်း မေးလိုသည်များ ရေးပါ သို့မဟုတ် ရှာဖွေပါ...' : 'Ask about this medicine or press search...')
                              : (chatLanguage === 'my' ? 'ဆေးဝါးအမည်၊ ရောဂါလက္ခဏာ (သို့) ကျန်းမာရေးပြဿနာ ရှာဖွေ မေးမြန်းပါ...' : 'Search medicines, symptoms, or ask Home Treatment Advisor...')
                          }
                          className="flex-1 bg-transparent py-2 sm:py-2.5 text-xs sm:text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none font-myanmar leading-relaxed"
                          autoFocus
                        />

                        {/* Camera / Photo Attachment Trigger */}
                        <button
                          onClick={() => setIsCameraMenuOpen((prev) => !prev)}
                          className={`p-2 sm:p-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                            isCameraMenuOpen || attachedImage
                              ? 'bg-blue-600 text-white'
                              : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                          title="Attach or take medicine photo"
                          type="button"
                        >
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Primary Search / Ask Action Button */}
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={(!input.trim() && !attachedImage) || loading}
                          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm font-myanmar flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                            (!input.trim() && !attachedImage) || loading
                              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                              : 'bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 shadow-xs'
                          }`}
                          type="button"
                          title="Search or Ask Doctor AI"
                        >
                          {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden xs:inline">{chatLanguage === 'my' ? 'ရှာဖွေမည်' : 'Search'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Saved Consultations Chips (Mapped from history prop) */}
                  {storedConsultations.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-neutral-200/60 dark:border-neutral-800/60 text-left">
                      <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2.5 font-myanmar">
                        {chatLanguage === 'my' ? 'ယခင် ဆေးဆွေးနွေးမှု မှတ်တမ်းများ' : 'Saved Consultations'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {storedConsultations.map((consult) => (
                          <button
                            key={consult.id}
                            onClick={() => handleRevisitConsultation(consult)}
                            type="button"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 text-xs text-neutral-700 dark:text-neutral-300 hover:border-purple-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer shadow-2xs font-myanmar"
                          >
                            <span>{consult.medicineResult ? '💊' : '🩺'}</span>
                            <span className="max-w-[200px] truncate">{consult.title}</span>
                            <ChevronRight className="w-3 h-3 text-neutral-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Active Message Stream: Gemini Borderless Aesthetic */
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Banner when viewing a revisited stored consultation */}
                  {revisitedConsultationTitle && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between gap-3 text-xs font-myanmar">
                      <div className="flex items-center gap-2 min-w-0">
                        <HistoryIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-neutral-500 dark:text-neutral-400 truncate">
                          {revisitedConsultationTitle}
                        </span>
                      </div>
                      <button
                        onClick={handleStartNewChat}
                        className="px-2.5 py-1 rounded-full text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-myanmar cursor-pointer shrink-0"
                        type="button"
                      >
                        {chatLanguage === 'my' ? 'ဆွေးနွေးမှုအသစ်' : 'New chat'}
                      </button>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isUser = msg.sender === 'user';

                    if (isUser) {
                      return (
                        <div key={msg.id} className="flex justify-end w-full">
                          <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
                            {msg.image && (
                              <div className="mb-2 relative group cursor-pointer" onClick={() => setEnlargedImage(msg.image || null)}>
                                <img
                                  src={msg.image}
                                  alt="Attached query"
                                  className="w-48 sm:w-56 h-36 sm:h-40 object-cover rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xs group-hover:opacity-95 transition-opacity"
                                />
                              </div>
                            )}
                            <div className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 sm:px-5 py-3 rounded-2xl rounded-tr-xs text-xs sm:text-sm font-myanmar leading-relaxed">
                              {msg.text}
                            </div>
                            <span className="text-[10px] text-neutral-400 mt-1 px-1 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Assistant Message (Gemini Borderless Style)
                    return (
                      <div key={msg.id} className="flex gap-3 sm:gap-4 justify-start w-full">
                        {/* Sparkles Avatar */}
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Emergency Alert Banner */}
                          {msg.isEmergencyAlert && (
                            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2.5 font-myanmar">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                              <div>
                                {chatLanguage === 'my' 
                                  ? 'အရေးပေါ်အခြေအနေ: အသက်အန္တရာယ် စိုးရိမ်ရပါက လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ!' 
                                  : 'Urgent Alert: Call Emergency Ambulance 192 immediately for acute danger!'}
                              </div>
                            </div>
                          )}

                          {/* Follow-up Question / Prompt Suggestion Box (ABOVE AI Answer) */}
                          <div className="p-3 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 font-myanmar">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              <span>
                                {chatLanguage === 'my'
                                  ? 'ဆက်လက်မေးမြန်းနိုင်သော မေးခွန်းများ (Follow-up Suggestions)'
                                  : 'Suggested Follow-up Questions'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(msg.suggestions && msg.suggestions.length > 0 ? msg.suggestions : (
                                chatLanguage === 'my' ? [
                                  'ဘေးထွက်ဆိုးကျိုးများ ဘာတွေရှိသလဲ',
                                  'မည်သည့် အစားအစာများနှင့် ရှောင်ရန်လိုသလဲ',
                                  'အသက် ၆၀ ကျော် သက်ကြီးရွယ်အို ဆေးညွှန်း',
                                  'တိုင်းရင်း ဆေးဖက်ဝင် အပင်များ ဆွေးနွေးရန်'
                                ] : [
                                  'What are the common side effects?',
                                  'What foods or drugs should I avoid?',
                                  'Dosage guidance for seniors over 60',
                                  'Consult traditional herbal remedies'
                                ]
                              )).map((sug, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => handleSendMessage(sug)}
                                  className="px-2.5 py-1 rounded-xl text-xs bg-white dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700/70 hover:border-purple-300 dark:hover:border-purple-700 transition-all font-myanmar cursor-pointer flex items-center gap-1"
                                  type="button"
                                >
                                  <span className="text-purple-500 font-bold">•</span>
                                  <span>{sug}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Embedded Medicine Analysis Card */}
                          {msg.medicineResult ? (
                            <MedicineAnalysisCard 
                              result={msg.medicineResult} 
                              language={chatLanguage}
                              onConsultAiDoctor={(query) => handleSendMessage(query)}
                            />
                          ) : (
                            /* Clean Assistant Text */
                            <div className="text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 font-myanmar space-y-2">
                              {msg.text.split('\n').map((line, lIdx) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return (
                                    <p key={lIdx} className="font-semibold text-sm sm:text-base text-neutral-950 dark:text-neutral-100 pt-1">
                                      {line.replace(/\*\*/g, '')}
                                    </p>
                                  );
                                }
                                if (line.startsWith('- ') || line.startsWith('• ')) {
                                  return (
                                    <div key={lIdx} className="flex items-start gap-2 pl-2">
                                      <span className="text-purple-500 font-bold">•</span>
                                      <span>{line.replace(/^[-•]\s*/, '')}</span>
                                    </div>
                                  );
                                }
                                return <p key={lIdx}>{line}</p>;
                              })}
                            </div>
                          )}

                          {/* Minimal Action Toolbar */}
                          <div className="flex items-center gap-1 text-neutral-400 pt-0.5">
                            {/* Copy */}
                            <button
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="p-1.5 rounded-lg text-xs hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Copy"
                              type="button"
                            >
                              {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>

                            {/* Like / Helpful */}
                            <button
                              onClick={() => {
                                setMessages((prev) => 
                                  prev.map((m) => m.id === msg.id ? { ...m, liked: !m.liked } : m)
                                );
                              }}
                              className={`p-1.5 rounded-lg hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                                msg.liked ? 'text-purple-600 dark:text-purple-400' : ''
                              }`}
                              title="Helpful"
                              type="button"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>

                            <span className="text-[10px] text-neutral-400 ml-2 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Loading Typing Indicator */}
                  {loading && (
                    <div className="flex items-center gap-3 animate-in fade-in duration-200">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]" />
                        <span className="text-xs text-neutral-400 font-myanmar ml-1">
                          {chatLanguage === 'my' ? 'စဉ်းစားနေပါသည်...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scroll to bottom floating button */}
            {showScrollBottom && (
              <button
                onClick={() => {
                  chatContainerRef.current?.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                  setShowScrollBottom(false);
                }}
                className="absolute right-6 bottom-24 p-2.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all cursor-pointer z-10"
                title="Scroll to latest message"
                type="button"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}

            {/* CONSISTENT BOTTOM SEARCH & PROMPT BAR (GEMINI DESIGN) - only during active chat */}
            {messages.length > 0 && (
              <div className="p-3 sm:p-4 bg-white/90 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 shrink-0 backdrop-blur-md">
                <div className="max-w-3xl mx-auto">

                {/* Attached Image Preview inside prompt container */}
                {attachedImage && (
                  <div className="mb-2 p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={attachedImage} 
                        alt="Preview" 
                        className="w-12 h-12 object-cover rounded-xl border border-neutral-300 dark:border-neutral-600"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-black dark:text-white truncate">
                          {attachedImageName || (chatLanguage === 'my' ? 'ရွေးချယ်ထားသော ဆေးဓာတ်ပုံ' : 'Attached Photo')}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-myanmar">
                          {chatLanguage === 'my' ? 'ဓာတ်ပုံ စစ်ဆေးရန် အဆင်သင့်ဖြစ်ပါပြီ' : 'Ready to examine'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAttachedImage(null);
                        setAttachedImageName(null);
                      }}
                      className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                      title="Remove image"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Camera / Sample Picker Popup Menu */}
                {isCameraMenuOpen && (
                  <div className="mb-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl animate-in fade-in zoom-in-95 duration-150 font-myanmar">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800">
                      <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>{chatLanguage === 'my' ? 'ဆေးဝါးဓာတ်ပုံ စစ်ဆေးရန် ရွေးချယ်ပါ' : 'Capture or Upload Medicine Photo'}</span>
                      </span>
                      <button 
                        onClick={() => setIsCameraMenuOpen(false)}
                        className="text-xs text-neutral-400 hover:text-black dark:hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                        type="button"
                      >
                        <Camera className="w-5 h-5" />
                        <span>{chatLanguage === 'my' ? 'ကင်မရာဖြင့် ဓာတ်ပုံရိုက်မည်' : 'Take Live Photo'}</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                        type="button"
                      >
                        <UploadCloud className="w-5 h-5" />
                        <span>{chatLanguage === 'my' ? 'ဖိုင်ထဲမှ ဓာတ်ပုံတင်မည်' : 'Upload from Gallery'}</span>
                      </button>
                    </div>

                    {/* 1-Click Sample Medicines */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <p className="text-[11px] font-bold text-neutral-500 mb-1.5">
                        {chatLanguage === 'my' ? 'နမူနာဆေးဝါးများ စမ်းသပ်ရန် (၁-ချက်နှိပ်):' : 'Or try sample medicines (1-click test):'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sampleMedicines.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleSelectSampleMedicine(m)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-myanmar transition-all hover:scale-102 cursor-pointer ${m.color}`}
                            type="button"
                          >
                            {chatLanguage === 'my' ? m.nameMy : m.nameEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Iconic Gemini Prompt Pill Container */}
                <div className="relative rounded-3xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 shadow-2xs transition-all flex items-end p-2 gap-1.5 sm:gap-2">
                  
                  {/* Plus / Camera Attachment Action Button */}
                  <button
                    onClick={() => setIsCameraMenuOpen((prev) => !prev)}
                    className={`p-2 sm:p-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                      isCameraMenuOpen || attachedImage
                        ? 'bg-blue-600 text-white'
                        : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
                    }`}
                    title="Attach or take medicine photo"
                    type="button"
                  >
                    <Camera className="w-5 h-5" />
                  </button>

                  {/* Auto-expanding Input Field */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      attachedImage
                        ? (chatLanguage === 'my' ? 'ဤဆေးဝါးအကြောင်း မေးလိုသည်များ ရေးပါ...' : 'Ask about this medicine or press send...')
                        : (chatLanguage === 'my' ? 'ဆေးဝါး၊ ကျန်းမာရေးပြဿနာ မေးမြန်းရန်...' : 'Ask Doctor AI or attach medicine photo...')
                    }
                    rows={1}
                    className="flex-1 bg-transparent py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none resize-none font-myanmar max-h-32 leading-relaxed"
                  />

                  {/* Gemini Iconic Circular Up-Arrow Send Button */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={(!input.trim() && !attachedImage) || loading}
                    className={`p-2 sm:p-2.5 rounded-full transition-all shrink-0 cursor-pointer ${
                      (!input.trim() && !attachedImage) || loading
                        ? 'bg-neutral-200 dark:bg-neutral-700/60 text-neutral-400 cursor-not-allowed'
                        : 'bg-neutral-900 text-white dark:bg-white dark:text-black hover:scale-105 active:scale-95 shadow-xs'
                    }`}
                    title="Send to Doctor AI"
                    type="button"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>

      </div>

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div 
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img 
              src={enlargedImage} 
              alt="Enlarged view" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <button 
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
