import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Languages, 
  AlertTriangle,
  Sparkles,
  Check,
  Copy,
  ChevronRight
} from 'lucide-react';
import { ChatMessage } from '../types';
import { cleanMarkdownText } from '../utils/cleanText';
import { getTopicSuggestions } from '../utils/suggestionHelper';

interface AiAssistantWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  language: 'en' | 'my';
  onOpenFullAssistant?: (prompt?: string) => void;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({
  isOpen,
  onToggle,
  language,
  onOpenFullAssistant
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLanguage, setChatLanguage] = useState<'en' | 'my'>(language);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am your Home Health Advisor. How can I help you with your health concerns or home remedies today?',
      myanmarText: 'မင်္ဂလာပါ။ ကျွန်ုပ်သည် အိမ်တွင်းကုသရေး အကြံပေး AI ဖြစ်ပါသည်။ ယနေ့ သင်၏ ကျန်းမာရေးဆိုင်ရာ သိလိုသည်များကို မေးမြန်းနိုင်ပါသည်ခင်ဗျာ။',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatLanguage(language);
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const suggestedQueries = chatLanguage === 'my' ? [
    { label: 'သွေးတိုးကျဆေးနည်း (BP)', query: 'သွေးတိုးရောဂါအတွက် ကြက်သွန်ဖြူနှင့် တိုင်းရင်းဆေးပင်များ အသုံးပြုပုံ ရှင်းပြပါ' },
    { label: 'ဆီးချိုထိန်းနည်း (ကြက်ဟင်းခါး)', query: 'ဆီးချို/သွေးချို ထိန်းညှိရန် ကြက်ဟင်းခါးသီးနှင့် တိုင်းရင်းဆေးနည်းများ' },
    { label: 'ဒူးနာ၊ အရိုးအဆစ်ရောင်', query: 'ဒူးနာ၊ ခါးနာ၊ အဆစ်အမြစ်ရောင်ရမ်းခြင်း သက်သာစေမည့် တိုင်းရင်းဆေးနှင့် ကြပ်ထုပ်နည်း' },
    { label: 'မီးလောင်ဒဏ်ရာ ပြုစုနည်း', query: 'မီးလောင်ဒဏ်ရာ အရေးပေါ် ရှေးဦးပြုစုနည်း ရှင်းပြပါ' },
    { label: 'မြွေကိုက်ခံရပါက ရှေးဦးပြုစုနည်း', query: 'မြွေကိုက်ခံရပါက ချက်ချင်း လုပ်ဆောင်ရမည့် အသက်ကယ်နည်း' },
  ] : [
    { label: 'Blood Pressure Herbal Care', query: 'Evidence-based herbs and garlic dosage for high blood pressure' },
    { label: 'Diabetes & Bitter Melon', query: 'How does bitter melon regulate blood sugar in diabetes?' },
    { label: 'Knee & Joint Arthritis', query: 'How to relieve knee osteoarthritis pain with turmeric and ginger poultice?' },
    { label: 'Burn First Aid steps', query: 'What are the first aid steps for severe burns?' },
    { label: 'Snakebite Protocol', query: 'What is the standardized emergency protocol for a snakebite?' },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: queryText, 
          language: chatLanguage
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const isBurmese = chatLanguage === 'my' || /[\u1000-\u109F]/.test(queryText);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: cleanMarkdownText(data.response),
        myanmarText: isBurmese ? undefined : cleanMarkdownText(data.myanmarResponse || ''),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.warn('Chat API error, fallback activated', err);
      const isBurmese = chatLanguage === 'my' || /[\u1000-\u109F]/.test(queryText);
      let fallbackText = '';
      
      const lower = queryText.toLowerCase();
      if (lower.includes('burn') || queryText.includes('မီးလောင်')) {
        fallbackText = isBurmese 
          ? '၁။ ရေအေးဖြင့် မိနစ် ၂၀ ဆက်တိုက် ဆေးကြောပါ။ ရေခဲမကပ်ရ။\n၂။ သွားတိုက်ဆေး၊ ပဲငံပြာရည် လုံးဝမလိမ်းပါနှင့်။\n၃။ အဝတ်သန့် (သို့) ပလတ်စတစ်စဖြင့် လျော့လျော့ အုပ်ထားပါ။\n၄။ ဒဏ်ရာကြီးပါက လူနာတင်ယာဉ် ၁၉၂ သို့ ချက်ချင်း ခေါ်ဆိုပါ။'
          : '1. Cool with clean tap water for 20 minutes (never use ice).\n2. Avoid folk pastes like toothpaste or soy sauce.\n3. Drape with sterile non-adherent dressing.\n4. If burn is extensive, dial 192 immediately.';
      } else if (lower.includes('snake') || queryText.includes('မြွေ')) {
        fallbackText = isBurmese
          ? '၁။ လူနာကို ငြိမ်ငြိမ်ထားပါ။ ခြေလက်ကို ကျောက်ပတ်တီးစည်းပါ။\n၂။ နှလုံးထက် နိမ့်သောနေရာတွင် ထားပါ။\n၃။ ကြိုးမချည်ရ၊ ဓားဖြင့်မခွဲရပါ။\n၄။ ဆေးရုံအရေးပေါ် ၁၉၂ သို့ ချက်ချင်းခေါ်ပါ။'
          : '1. Completely immobilize and splint the limb.\n2. Keep bitten area below heart level.\n3. DO NOT cut or apply tight tourniquets.\n4. Rush immediately to nearest hospital with antivenom (Dial 192).';
      } else {
        fallbackText = isBurmese
          ? 'တိုင်းရင်းဆေးကျမ်းကဏ္ဍတွင် အသိအမှတ်ပြု ဆေးဖက်ဝင်အပင်များနှင့် ဆေးနည်းများကို လေ့လာနိုင်ပါသည်။ အရေးပေါ် အခြေအနေများအတွက် လူနာတင်ယာဉ် ၁၉၂ သို့ ခေါ်ဆိုပါ။'
          : 'For verified herbal remedies and clinical safety guidelines, explore our Medicinal Plants Directory. For emergencies, dial 192.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-[4.75rem] right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end">
      {/* Chat Popover Window (Responsive Full-width Card on Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-x-3 bottom-[5.25rem] lg:static lg:inset-auto lg:w-96 lg:max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-border-subtle dark:border-neutral-800 flex flex-col overflow-hidden mb-2 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200 z-50 max-h-[calc(100dvh-120px)]"
          id="aiChatPopover"
        >
          {/* Header */}
          <div className="bg-black text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-extrabold text-xs shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight flex items-center gap-1.5 font-myanmar">
                  <span>{chatLanguage === 'my' ? 'အိမ်တွင်းကုသမှုအကြံပေး' : 'Home Treatment Advisor'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] text-neutral-400 font-medium">
                  {chatLanguage === 'my' ? 'မြန်မာဘာသာ အပြည့်အစုံ' : 'Bilingual AI Triage'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Reply Language Toggle */}
              <button
                onClick={() => setChatLanguage((prev) => (prev === 'en' ? 'my' : 'en'))}
                className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-neutral-200 flex items-center gap-1 cursor-pointer transition-colors"
                type="button"
                title="Toggle Reply Language"
              >
                <Languages className="w-3 h-3" />
                <span>{chatLanguage === 'my' ? 'မြန်မာ' : 'EN'}</span>
              </button>

              {/* Close Button */}
              <button
                aria-label="Close chat"
                className="w-7 h-7 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                onClick={onToggle}
                type="button"
                id="closeChatBtn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="p-3 sm:p-4 flex flex-col gap-3 h-[45vh] sm:h-80 max-h-[480px] overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
            {messages.map((msg, mIdx) => {
              const isUser = msg.sender === 'user';
              const prevUserMsg = messages.slice(0, mIdx).reverse().find(m => m.sender === 'user');
              const topicSuggestions = (msg.suggestions && msg.suggestions.length > 0)
                ? msg.suggestions
                : getTopicSuggestions(prevUserMsg?.text || '', msg.text || '', chatLanguage === 'my');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {!isUser && (
                    <div className="mb-2 p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 space-y-1.5 max-w-[95%]">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-purple-900 dark:text-purple-300 font-myanmar">
                        <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>{chatLanguage === 'my' ? 'မေးမြန်းနေသော အကြောင်းအရာနှင့် စပ်လျဉ်းသည့် မေးခွန်းများ' : 'Topic Relevant Suggestions'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {topicSuggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(sug)}
                            className="px-2 py-0.5 rounded-lg text-[10px] bg-white dark:bg-neutral-900 hover:bg-purple-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-purple-200/80 dark:border-neutral-700 transition-all font-myanmar cursor-pointer"
                            type="button"
                          >
                            • {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-sm ${
                      isUser
                        ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none'
                        : 'bg-white dark:bg-neutral-900 text-black dark:text-white border border-border-subtle dark:border-neutral-800 rounded-tl-none font-myanmar'
                    }`}
                  >
                    {msg.myanmarText && (
                      <p className="font-semibold font-myanmar mb-1 pb-1 border-b border-neutral-200 dark:border-neutral-800 text-[13px]" lang="my">
                        {msg.myanmarText}
                      </p>
                    )}
                    <p className="whitespace-pre-line font-myanmar">
                      {msg.text}
                    </p>

                    {!isUser && (
                      <div className="mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
                        <span>{msg.timestamp}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-border-subtle dark:border-neutral-800 max-w-[80%]">
                <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-[11px] text-neutral-500 font-myanmar ml-1">
                  {chatLanguage === 'my' ? 'အချက်အလက် စိစစ်နေပါသည်...' : 'Analyzing clinical repository...'}
                </span>
              </div>
            )}

            {/* Quick Question Suggestions */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider pl-1 font-myanmar">
                {chatLanguage === 'my' ? '၄၀+ နှင့် အရေးပေါ် မေးခွန်းများ' : 'Suggested Inquiries'}
              </span>
              {suggestedQueries.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.query)}
                  className="text-left px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white border border-border-subtle dark:border-neutral-800 text-xs font-medium transition-colors cursor-pointer font-myanmar"
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* Switch to Full Assistant Link */}
          {onOpenFullAssistant && (
            <button
              onClick={() => onOpenFullAssistant()}
              className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between border-t border-border-subtle dark:border-neutral-800 cursor-pointer"
              type="button"
            >
              <span className="font-myanmar">{language === 'my' ? 'မျက်နှာပြင်ပြည့် AI စနစ်သို့ သွားရန်' : 'Open Full Screen Assistant'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Chat Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-neutral-900 border-t border-border-subtle dark:border-neutral-800 flex items-center gap-2"
          >
            <input
              className="flex-grow bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-full text-xs font-medium text-black dark:text-white placeholder-neutral-500 border-0 focus:ring-1 focus:ring-black dark:focus:ring-white focus:outline-none font-myanmar"
              placeholder={chatLanguage === 'my' ? 'ဆေးနည်း (သို့) ရှေးဦးပြုစုနည်း မေးပါ...' : 'Ask healthcare question...'}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              aria-label="Send"
              className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 flex items-center justify-center shrink-0 transition-opacity cursor-pointer disabled:opacity-40"
              type="submit"
              disabled={!input.trim() || loading}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Pill Button */}
      <button
        className="h-12 px-5 rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center gap-2.5 transition-all cursor-pointer border border-neutral-700 dark:border-neutral-300"
        onClick={onToggle}
        type="button"
        id="toggleChatBtn"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="text-xs font-bold tracking-tight">
          {language === 'my' ? 'AI ဆေးပညာအကူ' : 'AI Health Assistant'}
        </span>
        <Bot className="w-4 h-4" />
      </button>
    </div>
  );
};
