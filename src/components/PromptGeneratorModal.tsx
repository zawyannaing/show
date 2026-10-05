import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  Copy, 
  Stethoscope, 
  Leaf, 
  ShieldAlert, 
  Wand2, 
  Send,
  HelpCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export interface PromptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'my';
  initialText?: string;
  onSelectPrompt: (promptText: string) => void;
}

type GeneratorTab = 'symptom' | 'herb' | 'interaction' | 'quick';

export const PromptGeneratorModal: React.FC<PromptGeneratorModalProps> = ({
  isOpen,
  onClose,
  language,
  initialText = '',
  onSelectPrompt
}) => {
  const [activeTab, setActiveTab] = useState<GeneratorTab>('symptom');
  const [copied, setCopied] = useState(false);

  // Form State 1: Symptom Consultation
  const [symptom, setSymptom] = useState(initialText || '');
  const [patientAge, setPatientAge] = useState('');
  const [duration, setDuration] = useState('');
  const [accompanying, setAccompanying] = useState('');
  const [preExisting, setPreExisting] = useState('');

  // Form State 2: Herb Dosage Query
  const [herbName, setHerbName] = useState('');
  const [herbPurpose, setHerbPurpose] = useState('');
  const [prepForm, setPrepForm] = useState('');

  // Form State 3: Herb-Drug Interaction
  const [traditionalRemedy, setTraditionalRemedy] = useState('');
  const [westernMedicine, setWesternMedicine] = useState('');

  // Form State 4: Quick Auto Enhance
  const [rawPrompt, setRawPrompt] = useState(initialText || '');
  const [enhancedResult, setEnhancedResult] = useState('');

  if (!isOpen) return null;

  // --- PROMPT GENERATORS ---

  // 1. Symptom Prompt Generator
  const generateSymptomPrompt = (): string => {
    if (language === 'my') {
      let prompt = `📌 [ကျန်းမာရေးနှင့် တိုင်းရင်းဆေး တိုင်ပင်မှု]\n`;
      prompt += `• ရောဂါလက္ခဏာ: ${symptom || 'မဖော်ပြထားပါ'}\n`;
      if (patientAge) prompt += `• လူနာအသက်/အမျိုးအစား: ${patientAge}\n`;
      if (duration) prompt += `• ဖြစ်ပွားချိန်: ${duration}\n`;
      if (accompanying) prompt += `• တွဲဖက်လက္ခဏာများ: ${accompanying}\n`;
      if (preExisting) prompt += `• ရှိရင်းစွဲ ရောဂါအခံ: ${preExisting}\n`;
      prompt += `\nကျေးဇူးပြု၍ အထက်ပါ လက္ခဏာများအတွက် ဘေးထွက်ဆိုးကျိုးကင်းမည့် သဘာဝ အိမ်တွင်း ဆေးနည်းများ၊ သောက်သုံးရန် ပမာဏ၊ အစားအသောက် ဆောင်ရန်/ရှောင်ရန်နှင့် ချက်ချင်း ဆေးရုံပြသရမည့် အရေးပေါ် လက္ခဏာများကို ပြည့်စုံစွာ ရှင်းပြပေးပါ။`;
      return prompt;
    } else {
      let prompt = `📌 [Clinical Consultation Query]\n`;
      prompt += `• Primary Symptom: ${symptom || 'Not specified'}\n`;
      if (patientAge) prompt += `• Patient Age Group: ${patientAge}\n`;
      if (duration) prompt += `• Duration: ${duration}\n`;
      if (accompanying) prompt += `• Accompanying Symptoms: ${accompanying}\n`;
      if (preExisting) prompt += `• Pre-existing Conditions: ${preExisting}\n`;
      prompt += `\nPlease provide evidence-based traditional herbal remedies, safe preparation methods, dietary guidelines, contraindications, and critical red-flag emergency symptoms.`;
      return prompt;
    }
  };

  // 2. Herb Dosage Prompt Generator
  const generateHerbPrompt = (): string => {
    if (language === 'my') {
      let prompt = `🌿 [ဆေးဖက်ဝင်အပင် မေးမြန်းချက်]\n`;
      prompt += `• ဆေးပင်/ဆေးအမည်: ${herbName || 'မဖော်ပြထားပါ'}\n`;
      if (herbPurpose) prompt += `• အသုံးပြုလိုသည့် ရည်ရွယ်ချက်: ${herbPurpose}\n`;
      if (prepForm) prompt += `• ဖျော်စပ်မည့် အသွင်သဏ္ဌာန်: ${prepForm}\n`;
      prompt += `\nကျေးဇူးပြု၍ ဤအပင်၏ ဆေးဖက်ဝင် ဓာတုဒြပ်ပေါင်းများ၊ မှန်ကန်သော သောက်သုံးပုံ ဆေးပမာဏ၊ သောက်သုံးရမည့် အချိန်နှင့် ကိုယ်ဝန်ဆောင်/နို့တိုက်မိခင်များအတွက် တားမြစ်ချက်များကို ရှင်းပြပေးပါ။`;
      return prompt;
    } else {
      let prompt = `🌿 [Botanical & Herbal Monograph Query]\n`;
      prompt += `• Herb Name: ${herbName || 'Not specified'}\n`;
      if (herbPurpose) prompt += `• Intended Purpose: ${herbPurpose}\n`;
      if (prepForm) prompt += `• Preparation Form: ${prepForm}\n`;
      prompt += `\nPlease detail active chemical compounds, standardized dosage, preparation instructions, administration timing, and clinical contraindications.`;
      return prompt;
    }
  };

  // 3. Interaction Prompt Generator
  const generateInteractionPrompt = (): string => {
    if (language === 'my') {
      return `💊 [တိုင်းရင်းဆေးနှင့် အနောက်တိုင်းဆေးဝါး ဓာတ်ပြုမှု စစ်ဆေးခြင်း]\n• တိုင်းရင်းဆေး/အပင်: ${traditionalRemedy || 'မဖော်ပြထားပါ'}\n• အနောက်တိုင်းဆေးဝါး: ${westernMedicine || 'မဖော်ပြထားပါ'}\n\nဤဆေးနှစ်မျိုး အတူတကွ တွဲဖက် သောက်သုံးပါက သွေးထွက်လွယ်ခြင်း သို့မဟုတ် အသည်း/ကျောက်ကပ် ဓာတ်ပြုမှု ဘေးထွက်ဆိုးကျိုးများ ရှိမရှိ၊ သွေးတိုး/ဆီးချို ဆေးများနှင့် မိတ်ဖက်ဖြစ်မှု သတိပေးချက်များကို ဆေးပညာအရ စိစစ်ပေးပါ။`;
    } else {
      return `💊 [Herb-Drug Interaction Inquiry]\n• Herbal/Traditional Remedy: ${traditionalRemedy || 'Not specified'}\n• Western Prescription Drug: ${westernMedicine || 'Not specified'}\n\nPlease analyze potential pharmacokinetic and pharmacodynamic interactions, contraindications, and clinical precautions when combining these remedies.`;
    }
  };

  // Get active preview text
  const getActiveGeneratedPrompt = (): string => {
    if (activeTab === 'symptom') return generateSymptomPrompt();
    if (activeTab === 'herb') return generateHerbPrompt();
    if (activeTab === 'interaction') return generateInteractionPrompt();
    return enhancedResult || rawPrompt;
  };

  const handleApplyPrompt = () => {
    const finalPrompt = getActiveGeneratedPrompt();
    onSelectPrompt(finalPrompt);
    onClose();
  };

  const handleCopyPrompt = () => {
    const finalPrompt = getActiveGeneratedPrompt();
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick Auto Enhancer
  const handleQuickEnhance = () => {
    if (!rawPrompt.trim()) return;
    const text = rawPrompt.trim();
    if (language === 'my') {
      setEnhancedResult(
        `✨ [အသေးစိတ် ပြည့်စုံသော ဆေးပညာ မေးခွန်း]\n"${text}"\n\nကျေးဇူးပြု၍ အထက်ပါ ကိစ္စနှင့် ပတ်သက်၍:\n၁။ သဘာဝ အိမ်တွင်း ဆေးနည်းများနှင့် သောက်သုံးရန် ပမာဏ\n၂။ အဓိက သတိပြုရမည့် ဘေးထွက်ဆိုးကျိုးနှင့် တားမြစ်ချက်များ\n၃။ အရေးပေါ် ဆေးရုံပြသရမည့် လက္ခဏာများကို စနစ်တကျ ရှင်းပြပေးပါ။`
      );
    } else {
      setEnhancedResult(
        `✨ [Clinical Inquiry Enhancement]\n"${text}"\n\nPlease provide a comprehensive structured medical response including:\n1. Standardized natural remedies and dosage guidelines\n2. Key contraindications and safety precautions\n3. Red-flag symptoms requiring emergency triage.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 font-myanmar">
      <div 
        className="bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] w-full max-w-xl rounded-3xl border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-black dark:text-white comfort:text-[#231f1a]">
                {language === 'my' ? 'AI မေးခွန်း ပိုမိုပြည့်စုံအောင် ပြုလုပ်စနစ်' : 'Clinical Prompt Assistant'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'my' 
                  ? 'တိကျပြည့်စုံသော ဆေးနည်းနှင့် အကြံပြုချက် ရရှိရန် မေးခွန်းကို အလိုအလျောက် ပုံစံထုတ်ပေးပါသည်' 
                  : 'Structure your query for high-precision AI medical analysis'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-neutral-100 dark:bg-neutral-800/80 comfort:bg-[#f2e9d8] border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('symptom')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'symptom'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'my' ? 'ရောဂါလက္ခဏာ' : 'Symptom'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('herb')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'herb'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Leaf className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'my' ? 'ဆေးဖက်ဝင်အပင်' : 'Herb Query'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interaction')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'interaction'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'my' ? 'ဆေးမိတ်ဖက်' : 'Interaction'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'quick'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'my' ? 'အမြန်ပြင်မည်' : 'Quick AI'}</span>
          </button>
        </div>

        {/* Modal Body Form */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: SYMPTOM CONSULTATION */}
          {activeTab === 'symptom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၁။ ရောဂါလက္ခဏာ (Symptom): *' : '1. Primary Symptom: *'}
                </label>
                <input
                  type="text"
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - ခေါင်းကိုက်ခြင်း၊ မူးဝေခြင်း' : 'e.g. Dizziness, tension headache'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {language === 'my' ? '၂။ လူနာအသက် / အုပ်စု:' : '2. Patient Age:'}
                  </label>
                  <input
                    type="text"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder={language === 'my' ? 'ဥပမာ - အသက် ၄၅ (အမျိုးသမီး)' : 'e.g. 45-year-old female'}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {language === 'my' ? '၃။ ဖြစ်ပွားနေသည့် ကြာချိန်:' : '3. Duration:'}
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder={language === 'my' ? 'ဥပမာ - ၂ ရက်ခန့်' : 'e.g. 2 days'}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၄။ တွဲဖက်လက္ခဏာများ:' : '4. Accompanying Symptoms:'}
                </label>
                <input
                  type="text"
                  value={accompanying}
                  onChange={(e) => setAccompanying(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - ဇာတ်ကြောတက်ခြင်း၊ ပျို့အန်ချင်ခြင်း' : 'e.g. Stiff neck, nausea'}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၅။ ရှိရင်းစွဲ ရောဂါအခံ (Pre-existing):' : '5. Pre-existing Conditions:'}
                </label>
                <input
                  type="text"
                  value={preExisting}
                  onChange={(e) => setPreExisting(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - သွေးတိုးရောဂါ၊ ဆီးချိုရောဂါ' : 'e.g. Hypertension, Type-2 Diabetes'}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: HERB DOSAGE QUERY */}
          {activeTab === 'herb' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၁။ ဆေးပင်/ဆေးအမည် (Herb Name): *' : '1. Botanical / Herb Name: *'}
                </label>
                <input
                  type="text"
                  value={herbName}
                  onChange={(e) => setHerbName(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - ကြက်ဟင်းခါး သို့မဟုတ် ချင်း' : 'e.g. Bitter Melon or Ginger'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၂။ အသုံးပြုလိုသည့် ရည်ရွယ်ချက်:' : '2. Intended Health Purpose:'}
                </label>
                <input
                  type="text"
                  value={herbPurpose}
                  onChange={(e) => setHerbPurpose(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - ဆီးချို ထိန်းရန်၊ အစာကြေလွယ်စေရန်' : 'e.g. Blood sugar control, digestion'}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၃။ ဖျော်စပ်မည့် ပုံစံ:' : '3. Preparation Form:'}
                </label>
                <input
                  type="text"
                  value={prepForm}
                  onChange={(e) => setPrepForm(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - သတ္တုရည် ကြိတ်သောက်ရန်၊ ပြုတ်သောက်ရန်' : 'e.g. Fresh juice extract, boiling water decoction'}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 3: HERB-DRUG INTERACTION */}
          {activeTab === 'interaction' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၁။ တိုင်းရင်းဆေး/ဆေးဖက်ဝင်အပင်:' : '1. Herbal / Traditional Remedy:'}
                </label>
                <input
                  type="text"
                  value={traditionalRemedy}
                  onChange={(e) => setTraditionalRemedy(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - ချင်းရေနွေးကြမ်း သို့မဟုတ် တမာရွက်' : 'e.g. Ginger tea or Neem leaf'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? '၂။ အနောက်တိုင်း ဆေးဝါး:' : '2. Western Prescription Drug:'}
                </label>
                <input
                  type="text"
                  value={westernMedicine}
                  onChange={(e) => setWesternMedicine(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - Aspirin သို့မဟုတ် Metformin' : 'e.g. Aspirin or Metformin'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 4: QUICK AI AUTO ENHANCER */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'my' ? 'သင့် မေးခွန်းတိုကို ရိုက်ထည့်ပါ:' : 'Type your short query:'}
                </label>
                <textarea
                  rows={3}
                  value={rawPrompt}
                  onChange={(e) => setRawPrompt(e.target.value)}
                  placeholder={language === 'my' ? 'ဥပမာ - ခေါင်းမူးပြီး ပျို့ချင်တယ်' : 'e.g. Feeling dizzy and nauseous'}
                  className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleQuickEnhance}
                disabled={!rawPrompt.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Wand2 className="w-4 h-4" />
                <span>{language === 'my' ? 'AI ဖြင့် အလိုအလျောက် ပိုမိုပြည့်စုံအောင် ပြင်မည်' : 'Auto-Enhance with AI Structure'}</span>
              </button>
            </div>
          )}

          {/* PREVIEW BOX OF GENERATED PROMPT */}
          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 comfort:bg-[#f2e9d8] border border-neutral-200 dark:border-neutral-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'my' ? 'ထုတ်လုပ်ပေးလိုက်သော မေးခွန်းပုံစံ (Generated Prompt Preview):' : 'Generated Clinical Prompt Preview:'}</span>
              </span>

              <button
                type="button"
                onClick={handleCopyPrompt}
                className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (language === 'my' ? 'ကူးပြီးပြီ' : 'Copied') : (language === 'my' ? 'ကူးမည်' : 'Copy')}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] border border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {getActiveGeneratedPrompt()}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 comfort:bg-[#f2e9d8]/50 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            {language === 'my' ? 'ပိတ်မည်' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleApplyPrompt}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'my' ? 'မေးခွန်း ထည့်သွင်း၍ AI ဆွေးနွေးမည်' : 'Use Prompt in AI Chat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
