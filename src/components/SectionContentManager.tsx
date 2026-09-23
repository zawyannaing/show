import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Leaf, 
  Phone, 
  Activity, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Save, 
  X, 
  Check, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { Herb, EmergencyProtocol, EmergencyHotline, CustomSymptomRemedy } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  getManagedHerbs,
  saveManagedHerbs,
  resetHerbsToDefault,
  getManagedProtocols,
  saveManagedProtocols,
  resetProtocolsToDefault,
  getManagedHotlines,
  saveManagedHotlines,
  resetHotlinesToDefault,
  getManagedSymptoms,
  saveManagedSymptoms,
  resetSymptomsToDefault
} from '../lib/contentManager';

interface SectionManagerProps {
  language: 'en' | 'my';
  initialTab?: 'plants' | 'symptoms' | 'firstaid' | 'hotlines' | 'apikeys';
}

export const SectionContentManager: React.FC<SectionManagerProps> = ({ 
  language,
  initialTab = 'plants'
}) => {
  const [activeTab, setActiveTab] = useState<'plants' | 'symptoms' | 'firstaid' | 'hotlines' | 'apikeys'>(initialTab);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // API Key state for Admin
  const [adminGeminiKey, setAdminGeminiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tmhip_custom_gemini_key') || '';
    }
    return '';
  });
  const [adminOpenRouterKey, setAdminOpenRouterKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tmhip_custom_openrouter_key') || '';
    }
    return '';
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  const handleSaveApiKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('tmhip_custom_gemini_key', adminGeminiKey.trim());
      localStorage.setItem('tmhip_custom_openrouter_key', adminOpenRouterKey.trim());
      window.dispatchEvent(new Event('tmhip_content_updated'));
    }
    showNotification(language === 'my' ? 'API Key များကို စနစ်တွင် သိမ်းဆည်းလိုက်ပါပြီ' : 'System API Keys updated successfully!');
  };

  const handleClearApiKeys = () => {
    if (!window.confirm(language === 'my' ? 'API Key များကို ပယ်ဖျက်မည်လား?' : 'Clear all system API keys?')) return;
    setAdminGeminiKey('');
    setAdminOpenRouterKey('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tmhip_custom_gemini_key');
      localStorage.removeItem('tmhip_custom_openrouter_key');
      window.dispatchEvent(new Event('tmhip_content_updated'));
    }
    showNotification(language === 'my' ? 'API Key များကို ဖျက်သိမ်းလိုက်ပါပြီ' : 'API keys cleared.');
  };

  // Data states
  const [herbs, setHerbs] = useState<Herb[]>(() => getManagedHerbs());
  const [symptoms, setSymptoms] = useState<CustomSymptomRemedy[]>(() => getManagedSymptoms());
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>(() => getManagedProtocols());
  const [hotlines, setHotlines] = useState<EmergencyHotline[]>(() => getManagedHotlines());

  // Editing states
  const [editingHerb, setEditingHerb] = useState<Herb | null>(null);
  const [isNewHerb, setIsNewHerb] = useState(false);

  const [editingSymptom, setEditingSymptom] = useState<CustomSymptomRemedy | null>(null);
  const [isNewSymptom, setIsNewSymptom] = useState(false);

  const [editingProtocol, setEditingProtocol] = useState<EmergencyProtocol | null>(null);
  const [isNewProtocol, setIsNewProtocol] = useState(false);

  const [editingHotline, setEditingHotline] = useState<EmergencyHotline | null>(null);
  const [isNewHotline, setIsNewHotline] = useState(false);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- HERB HANDLERS ---
  const handleSaveHerb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHerb) return;
    let updated: Herb[];
    if (isNewHerb) {
      updated = [editingHerb, ...herbs];
    } else {
      updated = herbs.map(h => (h.id === editingHerb.id ? editingHerb : h));
    }
    setHerbs(updated);
    saveManagedHerbs(updated);

    // Auto Broadcast to Supabase Live Feed (Facebook Style for all devices)
    const plantName = editingHerb.myanmarName || editingHerb.englishName;
    const postTitle = `[Live] 🌿 ဆေးဖက်ဝင်အပင် အသစ်ဖြည့်သွင်းမှု: ${plantName}`;
    const postContent = `📌 အမည်: ${plantName} (${editingHerb.scientificName})\n\n💡 သောက်သုံးပုံနှင့် ဆေးညွှန်း:\n${editingHerb.myanmarDescription || editingHerb.description || 'သဘာဝ ဆေးဖက်ဝင် အပင်ဖြစ်ပါသည်။'}\n\n⚠️ သတိပြုရန်:\n${editingHerb.dosageMy || editingHerb.dosage || 'ဆရာဝန် သို့မဟုတ် တိုင်းရင်းဆေးဆရာနှင့် တိုင်ပင်၍ သောက်သုံးပါ။'}`;

    try {
      await supabase.from('posts').insert([
        {
          title: postTitle,
          content: postContent,
          image_url: editingHerb.imageUrl || null
        }
      ]);
    } catch (err) {
      console.error('Failed to broadcast herb post:', err);
    }

    setEditingHerb(null);
    setIsNewHerb(false);
    showNotification(language === 'my' ? 'ဆေးဖက်ဝင်အပင် အချက်အလက်ကို သိမ်းဆည်းပြီး Feed သို့ ထည့်သွင်းလိုက်ပါပြီ' : 'Medicinal plant updated and broadcasted to Live Feed!');
  };

  const handleDeleteHerb = (id: string) => {
    if (!window.confirm(language === 'my' ? 'ဤအပင်ကို ဖျက်ရန် သေချာပါသလား?' : 'Delete this plant entry?')) return;
    const updated = herbs.filter(h => h.id !== id);
    setHerbs(updated);
    saveManagedHerbs(updated);
    showNotification(language === 'my' ? 'ဖျက်သိမ်းပြီးပါပြီ' : 'Plant deleted');
  };

  const handleResetHerbs = () => {
    if (!window.confirm(language === 'my' ? 'မူလ စာရင်းအတိုင်း ပြန်လည်ထားရှိမည်လား?' : 'Reset all herbs to original defaults?')) return;
    const def = resetHerbsToDefault();
    setHerbs(def);
    showNotification(language === 'my' ? 'မူလအတိုင်း ပြန်လည်ထားရှိပြီးပါပြီ' : 'Herbs reset to default');
  };

  // --- SYMPTOMS & REMEDIES HANDLERS ---
  const handleSaveSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSymptom) return;
    let updated: CustomSymptomRemedy[];
    if (isNewSymptom) {
      updated = [editingSymptom, ...symptoms];
    } else {
      updated = symptoms.map(s => (s.id === editingSymptom.id ? editingSymptom : s));
    }
    setSymptoms(updated);
    saveManagedSymptoms(updated);

    // Auto Broadcast to Supabase Live Feed (Facebook Style for all devices)
    const symptomName = editingSymptom.symptomNameMy || editingSymptom.symptomName;
    const remedyText = (editingSymptom.remediesMy && editingSymptom.remediesMy.length > 0)
      ? editingSymptom.remediesMy.join('\n• ')
      : (editingSymptom.remedies || []).join('\n• ');
    const precautionText = (editingSymptom.precautionsMy && editingSymptom.precautionsMy.length > 0)
      ? editingSymptom.precautionsMy.join('\n')
      : (editingSymptom.precautions || []).join('\n');

    const postTitle = `[Live] 🩺 အိမ်တွင်းကုထုံး အသစ်ဖြည့်သွင်းမှု: ${symptomName}`;
    const postContent = `📌 ရောဂါလက္ခဏာ: ${symptomName}\n\n💡 သဘာဝ ဆေးနည်းလမ်းညွှန်း:\n• ${remedyText}\n\n⚠️ သတိပေးချက်:\n${precautionText || 'ရောဂါပြင်းထန်ပါက နီးစပ်ရာ ဆေးရုံ သို့မဟုတ် ဆရာဝန်ထံ ချက်ချင်း ပြသပါ။'}`;

    try {
      await supabase.from('posts').insert([
        {
          title: postTitle,
          content: postContent,
          image_url: null
        }
      ]);
    } catch (err) {
      console.error('Failed to broadcast symptom post:', err);
    }

    setEditingSymptom(null);
    setIsNewSymptom(false);
    showNotification(language === 'my' ? 'ရောဂါလက္ခဏာနှင့် ဆေးနည်းကို သိမ်းဆည်းပြီး Feed သို့ ထည့်သွင်းလိုက်ပါပြီ' : 'Symptom & remedy updated and broadcasted to Live Feed!');
  };

  const handleDeleteSymptom = (id: string) => {
    if (!window.confirm(language === 'my' ? 'ဤရောဂါလက္ခဏာကို ဖျက်ရန် သေချာပါသလား?' : 'Delete this symptom entry?')) return;
    const updated = symptoms.filter(s => s.id !== id);
    setSymptoms(updated);
    saveManagedSymptoms(updated);
    showNotification(language === 'my' ? 'ဖျက်သိမ်းပြီးပါပြီ' : 'Symptom deleted');
  };

  const handleResetSymptoms = () => {
    if (!window.confirm(language === 'my' ? 'မူလ ဆေးနည်းများအတိုင်း ပြန်လည်ထားရှိမည်လား?' : 'Reset all symptoms & remedies to default?')) return;
    const def = resetSymptomsToDefault();
    setSymptoms(def);
    showNotification(language === 'my' ? 'မူလအတိုင်း ပြန်လည်ထားရှိပြီးပါပြီ' : 'Symptoms reset to default');
  };

  // --- FIRST AID PROTOCOL HANDLERS ---
  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProtocol) return;
    let updated: EmergencyProtocol[];
    if (isNewProtocol) {
      updated = [editingProtocol, ...protocols];
    } else {
      updated = protocols.map(p => (p.id === editingProtocol.id ? editingProtocol : p));
    }
    setProtocols(updated);
    saveManagedProtocols(updated);

    // Auto Broadcast to Supabase Live Feed (Facebook Style for all devices)
    const protocolTitle = editingProtocol.myanmarTitle || editingProtocol.title;
    const stepsText = (editingProtocol.steps || [])
      .map((s, idx) => `${idx + 1}. ${s.title || 'အဆင့်'}: ${s.instruction}`)
      .join('\n');
    const postTitle = `[Live] 🚑 အရေးပေါ် ရှေးဦးသူနာပြု လမ်းညွှန်: ${protocolTitle}`;
    const postContent = `📌 အရေးပေါ် အခြေအနေ: ${protocolTitle}\n\n💡 အသက်ကယ် ပြုစုနည်း အဆင့်ဆင့်:\n${stepsText}`;

    try {
      await supabase.from('posts').insert([
        {
          title: postTitle,
          content: postContent,
          image_url: null
        }
      ]);
    } catch (err) {
      console.error('Failed to broadcast protocol post:', err);
    }

    setEditingProtocol(null);
    setIsNewProtocol(false);
    showNotification(language === 'my' ? 'ရှေးဦးပြုစုနည်း အဆင့်ဆင့်ကို သိမ်းဆည်းပြီး Feed သို့ ထည့်သွင်းလိုက်ပါပြီ' : 'First Aid protocol updated and broadcasted to Live Feed!');
  };

  const handleDeleteProtocol = (id: string) => {
    if (!window.confirm(language === 'my' ? 'ဖျက်ရန် သေချာပါသလား?' : 'Delete this protocol?')) return;
    const updated = protocols.filter(p => p.id !== id);
    setProtocols(updated);
    saveManagedProtocols(updated);
    showNotification(language === 'my' ? 'ဖျက်သိမ်းပြီးပါပြီ' : 'Protocol deleted');
  };

  const handleResetProtocols = () => {
    if (!window.confirm(language === 'my' ? 'မူလအတိုင်း ပြန်လည်ထားရှိမည်လား?' : 'Reset all First Aid protocols to default?')) return;
    const def = resetProtocolsToDefault();
    setProtocols(def);
    showNotification(language === 'my' ? 'မူလအတိုင်း ပြန်လည်ထားရှိပြီးပါပြီ' : 'Protocols reset to default');
  };

  // --- HOTLINES HANDLERS ---
  const handleSaveHotline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotline) return;
    let updated: EmergencyHotline[];
    if (isNewHotline) {
      updated = [editingHotline, ...hotlines];
    } else {
      updated = hotlines.map(h => (h.id === editingHotline.id ? editingHotline : h));
    }
    setHotlines(updated);
    saveManagedHotlines(updated);

    // Auto Broadcast to Supabase Live Feed (Facebook Style for all devices)
    const hotlineName = editingHotline.myanmarName || editingHotline.name;
    const postTitle = `[Live] 📞 အရေးပေါ် ဖုန်းနံပါတ် အသစ်: ${hotlineName}`;
    const postContent = `📌 ဌာန/ဆေးရုံ: ${hotlineName}\n📞 ဖုန်းနံပါတ်: ${editingHotline.number}`;

    try {
      await supabase.from('posts').insert([
        {
          title: postTitle,
          content: postContent,
          image_url: null
        }
      ]);
    } catch (err) {
      console.error('Failed to broadcast hotline post:', err);
    }

    setEditingHotline(null);
    setIsNewHotline(false);
    showNotification(language === 'my' ? 'ဖုန်းနံပါတ်ကို သိမ်းဆည်းပြီး Feed သို့ ထည့်သွင်းလိုက်ပါပြီ' : 'Phone hotline updated and broadcasted to Live Feed!');
  };

  const handleDeleteHotline = (id: string) => {
    if (!window.confirm(language === 'my' ? 'ဖျက်ရန် သေချာပါသလား?' : 'Delete this hotline?')) return;
    const updated = hotlines.filter(h => h.id !== id);
    setHotlines(updated);
    saveManagedHotlines(updated);
    showNotification(language === 'my' ? 'ဖျက်သိမ်းပြီးပါပြီ' : 'Hotline deleted');
  };

  const handleResetHotlines = () => {
    if (!window.confirm(language === 'my' ? 'မူလအတိုင်း ပြန်လည်ထားရှိမည်လား?' : 'Reset all emergency hotlines to default?')) return;
    const def = resetHotlinesToDefault();
    setHotlines(def);
    showNotification(language === 'my' ? 'မူလအတိုင်း ပြန်လည်ထားရှိပြီးပါပြီ' : 'Hotlines reset to default');
  };

  return (
    <div className="mt-8 bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] p-6 sm:p-8 shadow-sm font-myanmar">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'ကဏ္ဍအလိုက် စီမံခန့်ခွဲမှုစနစ်' : 'Section Content Management'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white comfort:text-[#231f1a]">
            {language === 'my' ? 'ကဏ္ဍများ ပြင်ဆင်/မွမ်းမံခြင်း (Manage & Update Sections)' : 'Manage & Update App Sections'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'my'
              ? 'ရောဂါလက္ခဏာများ၊ ဆေးဖက်ဝင်အပင်များ၊ ရှေးဦးပြုစုနည်းနှင့် အရေးပေါ်ဖုန်းများကို တိုက်ရိုက် မွမ်းမံ/ပြင်ဆင်/အသစ်ထည့်နိုင်ပါသည်'
              : 'Add, update or delete entries in Symptoms & Remedies, Medicinal Plants, First Aid Protocols, and Emergency Phone Numbers.'}
          </p>
        </div>

        {/* Global Success Notification */}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-xs font-bold shadow-sm animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Tabs for Each Section */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 comfort:bg-[#f2e9d8] mb-8">
        <button
          type="button"
          onClick={() => { setActiveTab('plants'); setEditingHerb(null); }}
          className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'plants'
              ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Leaf className="w-4 h-4 text-emerald-600" />
          <span>{language === 'my' ? 'အပင်များ' : 'Plants'} ({herbs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('symptoms'); setEditingSymptom(null); }}
          className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'symptoms'
              ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 text-teal-600" />
          <span>{language === 'my' ? 'ရောဂါလက္ခဏာများ' : 'Symptoms'} ({symptoms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('firstaid'); setEditingProtocol(null); }}
          className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'firstaid'
              ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-red-500" />
          <span>{language === 'my' ? 'ရှေးဦးပြုစုနည်း' : 'First Aid'} ({protocols.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('hotlines'); setEditingHotline(null); }}
          className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'hotlines'
              ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Phone className="w-4 h-4 text-sky-500" />
          <span>{language === 'my' ? 'ဖုန်းများ' : 'Hotlines'} ({hotlines.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('apikeys')}
          className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer col-span-2 sm:col-span-1 ${
            activeTab === 'apikeys'
              ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-500" />
          <span>{language === 'my' ? 'API Key စီမံရန်' : 'API Keys'}</span>
        </button>
      </div>

      {/* ================= SECTION 1: MEDICINAL PLANTS ================= */}
      {activeTab === 'plants' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-black dark:text-white comfort:text-[#231f1a]">
                {language === 'my' ? 'ဆေးဖက်ဝင်အပင်များ စီမံခန့်ခွဲရန်' : 'Manage Medicinal Plants Directory'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'my' ? 'အပင်အသစ်ထည့်သွင်းခြင်း၊ ဓာတုဒြပ်ပေါင်းနှင့် သောက်သုံးပုံများကို ပြင်ဆင်နိုင်ပါသည်' : 'Add new botanical entries or edit clinical monographs.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetHerbs}
                className="px-3.5 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'မူလအတိုင်းပြန်ထား' : 'Reset to Default'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingHerb({
                    id: `herb-${Date.now()}`,
                    scientificName: '',
                    myanmarName: '',
                    englishName: '',
                    pharmaceuticalPart: 'Leaf / Stem',
                    pharmaceuticalPartMy: 'အရွက် / အရိုးတံ',
                    category: 'digestive',
                    tags: ['Traditional', 'Herbal'],
                    tagsMy: ['ရိုးရာဆေး', 'သဘာဝဆေးပင်'],
                    description: '',
                    myanmarDescription: '',
                    dosage: '5-10g boiled water decoction',
                    dosageMy: '၅-၁၀ ဂရမ်ကို ရေနွေးဖြင့် ကျိုချက်သောက်သုံးရန်',
                    preparation: 'Boil in clean water for 15 minutes.',
                    preparationMy: 'ရေစင်ကြယ်စွာဖြင့် ၁၅ မိနစ်ခန့် ပြုတ်၍ သောက်သုံးရန်',
                    clinicalIndication: '',
                    clinicalIndicationMy: '',
                    imageUrl: 'https://images.unsplash.com/photo-1546842931-886c185b4c8c?auto=format&fit=crop&w=600&q=80',
                    activeCompounds: ['Flavonoids', 'Tannins'],
                    activeCompoundsMy: ['ဖလေဗိုနွိုက်', 'တင်နင်'],
                    traditionalUses: ['Digestion', 'General wellness'],
                    traditionalUsesMy: ['အစာကြေစေရန်', 'ကျန်းမာရေးနှင့် ခွန်အားပြည့်စေရန်'],
                    contraindications: ['Pregnancy'],
                    contraindicationsMy: ['ကိုယ်ဝန်ဆောင်ကာလတွင် ဆရာဝန်ညွှန်ကြားချက်မပါဘဲ မသောက်သုံးရ'],
                    chemicalFamily: 'Phytochemicals',
                    chemicalFamilyMy: 'သဘာဝဆေးဖက်ဝင်ဓာတ်များ',
                    verified: true,
                  });
                  setIsNewHerb(true);
                }}
                className="px-4 py-1.5 rounded-full bg-black dark:bg-white comfort:bg-[#231f1a] text-white dark:text-black comfort:text-[#faf6ee] text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'my' ? '+ အပင်အသစ်ထည့်မည်' : '+ Add New Herb'}</span>
              </button>
            </div>
          </div>

          {/* Herb Edit/Create Form Modal or Inline */}
          {editingHerb && (
            <form onSubmit={handleSaveHerb} className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 comfort:bg-[#f2e9d8]/60 border border-emerald-500/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
                <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  {isNewHerb ? (language === 'my' ? 'အပင်အသစ် ထည့်သွင်းခြင်း' : 'Add New Plant Monograph') : (language === 'my' ? 'အပင် အချက်အလက် ပြင်ဆင်ခြင်း' : 'Edit Plant Monograph')}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingHerb(null)}
                  className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'မြန်မာအမည်' : 'Myanmar Name'} *</label>
                  <input
                    type="text"
                    required
                    value={editingHerb.myanmarName}
                    onChange={e => setEditingHerb({ ...editingHerb, myanmarName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - ချင်း (သို့) တမာ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'အင်္ဂလိပ်အမည်' : 'English Common Name'} *</label>
                  <input
                    type="text"
                    required
                    value={editingHerb.englishName}
                    onChange={e => setEditingHerb({ ...editingHerb, englishName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="e.g. Ginger"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ရုက္ခဗေဒအမည်' : 'Scientific Botanical Name'} *</label>
                  <input
                    type="text"
                    required
                    value={editingHerb.scientificName}
                    onChange={e => setEditingHerb({ ...editingHerb, scientificName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 italic"
                    placeholder="e.g. Zingiber officinale"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ကဏ္ဍ (Category)' : 'Category'}</label>
                  <select
                    value={editingHerb.category}
                    onChange={e => setEditingHerb({ ...editingHerb, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="digestive">Digestive (အစာခြေစနစ်)</option>
                    <option value="respiratory">Respiratory (အသက်ရှူလမ်းကြောင်း)</option>
                    <option value="antimicrobial">Antimicrobial (ပိုးသတ်)</option>
                    <option value="anti-inflammatory">Anti-inflammatory (ရောင်ရမ်းကျ)</option>
                    <option value="adaptogen">Adaptogen (အားတိုး)</option>
                    <option value="circulatory">Circulatory (သွေးလည်ပတ်မှု)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဓာတ်ပုံ URL (Image URL)' : 'Photo Image URL'}</label>
                  <input
                    type="text"
                    value={editingHerb.imageUrl}
                    onChange={e => setEditingHerb({ ...editingHerb, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဆေးဖက်ဝင် အကျိုးကျေးဇူး (မြန်မာ)' : 'Clinical Indication (Myanmar)'}</label>
                  <input
                    type="text"
                    value={editingHerb.clinicalIndicationMy || ''}
                    onChange={e => setEditingHerb({ ...editingHerb, clinicalIndicationMy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - မူးဝေခြင်း သက်သာစေသည်၊ အစာကြေလွယ်စေသည်"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဆေးဖက်ဝင် အကျိုးကျေးဇူး (English)' : 'Clinical Indication (English)'}</label>
                  <input
                    type="text"
                    value={editingHerb.clinicalIndication}
                    onChange={e => setEditingHerb({ ...editingHerb, clinicalIndication: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="e.g. Relieves nausea, improves digestive motility"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{language === 'my' ? 'အသေးစိတ် ဖော်ပြချက် (Description in Myanmar)' : 'Description (Myanmar)'}</label>
                <textarea
                  rows={2}
                  value={editingHerb.myanmarDescription || ''}
                  onChange={e => setEditingHerb({ ...editingHerb, myanmarDescription: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  placeholder="အပင်၏ သဘောသဘာဝနှင့် သောက်သုံးနည်း ဖော်ပြပါ..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဆေးဖက်ဝင် အစိတ်အပိုင်း (မြန်မာ)' : 'Part Used (Myanmar)'}</label>
                  <input
                    type="text"
                    value={editingHerb.pharmaceuticalPartMy || ''}
                    onChange={e => setEditingHerb({ ...editingHerb, pharmaceuticalPartMy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - အရွက်၊ အမြစ်၊ အခေါက်"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဓာတုဗေဒမျိုးနွယ် (မြန်မာ)' : 'Chemical Family (Myanmar)'}</label>
                  <input
                    type="text"
                    value={editingHerb.chemicalFamilyMy || ''}
                    onChange={e => setEditingHerb({ ...editingHerb, chemicalFamilyMy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - ဂျင်ဂျာရောလ်၊ ဖလေဗိုနွိုက်"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'သောက်သုံးရန် ပမာဏ (မြန်မာ)' : 'Dosage (Myanmar)'}</label>
                  <input
                    type="text"
                    value={editingHerb.dosageMy || editingHerb.dosage}
                    onChange={e => setEditingHerb({ ...editingHerb, dosageMy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - တစ်နေ့ ၂ ကြိမ် ထမင်းစားပြီး"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဖျော်စပ်ပြင်ဆင်ပုံ (မြန်မာ)' : 'Preparation (Myanmar)'}</label>
                  <input
                    type="text"
                    value={editingHerb.preparationMy || editingHerb.preparation}
                    onChange={e => setEditingHerb({ ...editingHerb, preparationMy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - ရေနွေးကြမ်းကဲ့သို့ ခတ်သောက်ရန်"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHerb(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'အချက်အလက် သိမ်းမည်' : 'Save Herb'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Herb Items List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {herbs.map(herb => (
              <div
                key={herb.id}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 comfort:bg-[#f2e9d8]/50 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={herb.imageUrl}
                    alt={herb.myanmarName}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
                  />
                  <div className="truncate">
                    <h5 className="font-bold text-xs sm:text-sm text-black dark:text-white truncate">
                      {herb.myanmarName} <span className="text-[11px] text-neutral-400 font-normal">({herb.englishName})</span>
                    </h5>
                    <p className="text-[11px] text-neutral-500 italic truncate">{herb.scientificName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingHerb(herb); setIsNewHerb(false); }}
                    className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHerb(herb.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SECTION 2: SYMPTOMS & REMEDIES ================= */}
      {activeTab === 'symptoms' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-black dark:text-white comfort:text-[#231f1a]">
                {language === 'my' ? 'ရောဂါလက္ခဏာများ နှင့် အိမ်တွင်းဆေးနည်းများ စီမံခန့်ခွဲရန်' : 'Manage Symptoms & Home Remedies'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'my' 
                  ? 'နှာစီး၊ ချောင်းဆိုး၊ ဗိုက်အောင့်၊ အရေပြား၊ သွားကိုက်၊ ခေါင်းကိုက် နှင့် အခြားရောဂါလက္ခဏာ ဆေးနည်းများကို အသစ်ထည့်/ပြင်ဆင်နိုင်ပါသည်' 
                  : 'Add, edit, or remove home remedies and precaution guidelines for symptoms.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSymptoms}
                className="px-3.5 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'မူလအတိုင်းပြန်ထား' : 'Reset to Default'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingSymptom({
                    id: `sym-${Date.now()}`,
                    symptomName: '',
                    symptomNameMy: '',
                    category: 'general',
                    categoryMy: 'အထွေထွေ',
                    description: '',
                    descriptionMy: '',
                    remedies: [],
                    remediesMy: [],
                    precautions: [],
                    precautionsMy: [],
                    isCustom: true
                  });
                  setIsNewSymptom(true);
                }}
                className="px-4 py-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'my' ? '+ ရောဂါလက္ခဏာသစ် ထည့်ရန်' : '+ Add Symptom'}</span>
              </button>
            </div>
          </div>

          {/* Symptom Edit Form */}
          {editingSymptom && (
            <form onSubmit={handleSaveSymptom} className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 comfort:bg-[#f2e9d8]/60 border border-teal-500/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
                <h4 className="font-bold text-sm text-teal-800 dark:text-teal-300">
                  {isNewSymptom ? 'ရောဂါလက္ခဏာသစ် ထည့်သွင်းခြင်း' : 'ရောဂါလက္ခဏာ ပြင်ဆင်ခြင်း'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingSymptom(null)}
                  className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ရောဂါလက္ခဏာ အမည် (မြန်မာ)' : 'Symptom Name (Myanmar)'} *</label>
                  <input
                    type="text"
                    required
                    value={editingSymptom.symptomNameMy}
                    onChange={e => setEditingSymptom({ ...editingSymptom, symptomNameMy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - ခေါင်းမူးခြင်း"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ရောဂါလက္ခဏာ အမည် (အင်္ဂလိပ်)' : 'Symptom Name (English)'} *</label>
                  <input
                    type="text"
                    required
                    value={editingSymptom.symptomName}
                    onChange={e => setEditingSymptom({ ...editingSymptom, symptomName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="e.g. Dizziness / Vertigo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'အမျိုးအစား အမည် (မြန်မာ)' : 'Category Name (Myanmar)'}</label>
                  <input
                    type="text"
                    value={editingSymptom.categoryMy}
                    onChange={e => setEditingSymptom({ ...editingSymptom, categoryMy: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - အသက်ရှူလမ်းကြောင်း၊ အစာခြေစနစ်"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ကဏ္ဍ Key (Category)' : 'Category Key'}</label>
                  <select
                    value={editingSymptom.category}
                    onChange={e => setEditingSymptom({ ...editingSymptom, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="respiratory">Respiratory (အသက်ရှူလမ်းကြောင်း)</option>
                    <option value="digestive">Digestive (အစာခြေစနစ်)</option>
                    <option value="dermatology">Dermatology (အရေပြား)</option>
                    <option value="dental">Dental (သွားနှင့် ခံတွင်း)</option>
                    <option value="neurology">Neurology (ဦးနှောက်နှင့် အာရုံကြော)</option>
                    <option value="general">General (အထွေထွေ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{language === 'my' ? 'လက္ခဏာ ဖော်ပြချက် (မြန်မာ)' : 'Description (Myanmar)'}</label>
                <textarea
                  rows={2}
                  value={editingSymptom.descriptionMy}
                  onChange={e => setEditingSymptom({ ...editingSymptom, descriptionMy: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  placeholder="လက္ခဏာအကြောင်း အတိုချုပ်"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {language === 'my' ? 'အိမ်တွင်း ဆေးနည်းများ (တစ်ကြောင်းလျှင် နည်းတစ်ခုစီ ရေးပါ)' : 'Home Remedies (One per line)'} *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingSymptom.remediesMy.join('\n')}
                  onChange={e => {
                    const lines = e.target.value.split('\n');
                    setEditingSymptom({
                      ...editingSymptom,
                      remediesMy: lines,
                      remedies: lines
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-myanmar"
                  placeholder="ချင်းရေနွေးကြမ်း သောက်ပါ&#10;ဆားနွေးရေဖြင့် ပလုတ်ကျင်းပါ"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {language === 'my' ? 'သတိပြုရန်အချက်များ (တစ်ကြောင်းလျှင် တစ်ခုစီ ရေးပါ)' : 'Precautions (One per line)'}
                </label>
                <textarea
                  rows={2}
                  value={(editingSymptom.precautionsMy || []).join('\n')}
                  onChange={e => {
                    const lines = e.target.value.split('\n');
                    setEditingSymptom({
                      ...editingSymptom,
                      precautionsMy: lines,
                      precautions: lines
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-myanmar"
                  placeholder="အဖျား ၃ ရက်ထက်ပိုပါက ဆရာဝန်ပြပါ"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSymptom(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'သိမ်းမည်' : 'Save Symptom'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Symptoms List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {symptoms.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 comfort:bg-[#f2e9d8]/50 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                      {item.categoryMy || item.category}
                    </span>
                    <h5 className="font-bold text-xs sm:text-sm text-black dark:text-white">
                      {item.symptomNameMy} <span className="text-[11px] text-neutral-400 font-normal">({item.symptomName})</span>
                    </h5>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">{item.descriptionMy || item.description}</p>
                  <p className="text-[10px] text-teal-700 dark:text-teal-400 mt-0.5 font-semibold">
                    ဆေးနည်း {item.remediesMy.length} မျိုး ပါဝင်ပါသည်
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingSymptom(item); setIsNewSymptom(false); }}
                    className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSymptom(item.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SECTION 3: FIRST AID PROTOCOLS ================= */}
      {activeTab === 'firstaid' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-black dark:text-white comfort:text-[#231f1a]">
                {language === 'my' ? 'အရေးပေါ် ရှေးဦးပြုစုနည်းများ စီမံခန့်ခွဲရန်' : 'Manage First Aid Emergency Protocols'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'my' ? 'မီးလောင်၊ မြွေကိုက်၊ အသက်ရှူကြပ်နှင့် နှလုံးရပ် အသက်ကယ်အဆင့်ဆင့် လမ်းညွှန်များကို ပြင်ဆင်နိုင်ပါသည်' : 'Update clinical emergency rescue steps, critical badges & instructions.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetProtocols}
                className="px-3.5 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'မူလအတိုင်းပြန်ထား' : 'Reset to Default'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingProtocol({
                    id: `protocol-${Date.now()}`,
                    number: protocols.length + 1,
                    title: '',
                    myanmarTitle: '',
                    category: 'heat-fevers',
                    badge: 'CRITICAL',
                    badgeType: 'black',
                    steps: [
                      {
                        title: 'Step 1: Immediate Safety',
                        instruction: 'Remove patient from immediate hazard.',
                        caution: 'Do not panic.'
                      }
                    ]
                  });
                  setIsNewProtocol(true);
                }}
                className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'my' ? '+ ရှေးဦးပြုစုနည်းအသစ်' : '+ Add Protocol'}</span>
              </button>
            </div>
          </div>

          {/* Protocol Edit Form */}
          {editingProtocol && (
            <form onSubmit={handleSaveProtocol} className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 comfort:bg-[#f2e9d8]/60 border border-red-500/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
                <h4 className="font-bold text-sm text-red-800 dark:text-red-300">
                  {isNewProtocol ? 'ရှေးဦးပြုစုနည်းအသစ် ထည့်သွင်းခြင်း' : 'ရှေးဦးပြုစုနည်း ပြင်ဆင်ခြင်း'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingProtocol(null)}
                  className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'မြန်မာခေါင်းစဉ်' : 'Title (Myanmar)'} *</label>
                  <input
                    type="text"
                    required
                    value={editingProtocol.myanmarTitle}
                    onChange={e => setEditingProtocol({ ...editingProtocol, myanmarTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - မီးလောင်ဒဏ်ရာ ရှေးဦးပြုစုနည်း"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'အင်္ဂလိပ်ခေါင်းစဉ်' : 'Title (English)'} *</label>
                  <input
                    type="text"
                    required
                    value={editingProtocol.title}
                    onChange={e => setEditingProtocol({ ...editingProtocol, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="e.g. Burn & Thermal Injury Protocol"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ကဏ္ဍ (Category)' : 'Category'}</label>
                  <select
                    value={editingProtocol.category}
                    onChange={e => setEditingProtocol({ ...editingProtocol, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="heat-fevers">Heat & Envenomation (အပူ၊ မီးလောင်၊ မြွေကိုက်)</option>
                    <option value="respiratory">Respiratory & Choking (အသက်ရှူလမ်းကြောင်း၊ ရင်ကျပ်)</option>
                    <option value="gastrointestinal">Gastrointestinal & Poisoning (အဆိပ်သင့်မှု)</option>
                    <option value="musculoskeletal">Trauma & Fractures (အရိုးကျိုးဒဏ်ရာ)</option>
                    <option value="cardiovascular">Cardiovascular & Stroke (နှလုံးနှင့် လေဖြတ်)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'အရေးပေါ်အဆင့် (Badge)' : 'Emergency Badge'}</label>
                  <select
                    value={editingProtocol.badge}
                    onChange={e => setEditingProtocol({ ...editingProtocol, badge: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="LIFE SAFETY">LIFE SAFETY</option>
                    <option value="RAPID ACTION">RAPID ACTION</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold">{language === 'my' ? 'အရေးပေါ် ကယ်ဆယ်နည်း အဆင့် (၁)' : 'Step 1 Instruction'}</label>
                <input
                  type="text"
                  value={editingProtocol.steps[0]?.instruction || ''}
                  onChange={e => {
                    const steps = [...editingProtocol.steps];
                    if (steps[0]) {
                      steps[0].instruction = e.target.value;
                    } else {
                      steps[0] = { title: 'Action', instruction: e.target.value };
                    }
                    setEditingProtocol({ ...editingProtocol, steps });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  placeholder="အဆင့် ၁ လုပ်ဆောင်ရန် လမ်းညွှန်..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProtocol(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'သိမ်းမည်' : 'Save Protocol'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Protocols List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {protocols.map(protocol => (
              <div
                key={protocol.id}
                className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 comfort:bg-[#f2e9d8]/50 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300">
                      {protocol.badge}
                    </span>
                    <h5 className="font-bold text-xs sm:text-sm text-black dark:text-white">
                      {protocol.myanmarTitle} <span className="text-[11px] text-neutral-400 font-normal">({protocol.title})</span>
                    </h5>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 truncate max-w-md">
                    {protocol.steps[0]?.instruction}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingProtocol(protocol); setIsNewProtocol(false); }}
                    className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProtocol(protocol.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SECTION 4: EMERGENCY HOTLINES & PHONES ================= */}
      {activeTab === 'hotlines' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-black dark:text-white comfort:text-[#231f1a]">
                {language === 'my' ? 'အရေးပေါ်ဖုန်းနံပါတ်များ စီမံခန့်ခွဲရန်' : 'Manage Emergency Phone Hotlines'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'my' ? 'လူနာတင်ယာဉ်၊ မီးသတ်၊ ဆေးရုံကြီးများနှင့် အရေးပေါ်ဖုန်းလိုင်းများကို ပြင်ဆင်/အသစ်ထည့်သွင်းနိုင်ပါသည်' : 'Update dispatch numbers for Ambulance, Fire, Poison Center & Hospitals.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetHotlines}
                className="px-3.5 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'မူလအတိုင်းပြန်ထား' : 'Reset to Default'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingHotline({
                    id: `hotline-${Date.now()}`,
                    name: '',
                    myanmarName: '',
                    number: '',
                    icon: 'phone',
                    isPrimary: false
                  });
                  setIsNewHotline(true);
                }}
                className="px-4 py-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'my' ? '+ ဖုန်းနံပါတ်အသစ်' : '+ Add Hotline'}</span>
              </button>
            </div>
          </div>

          {/* Hotline Edit Form */}
          {editingHotline && (
            <form onSubmit={handleSaveHotline} className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 comfort:bg-[#f2e9d8]/60 border border-sky-500/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
                <h4 className="font-bold text-sm text-sky-800 dark:text-sky-300">
                  {isNewHotline ? 'ဖုန်းနံပါတ်အသစ် ထည့်သွင်းခြင်း' : 'ဖုန်းနံပါတ် ပြင်ဆင်ခြင်း'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingHotline(null)}
                  className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဌာန / မြန်မာအမည်' : 'Agency / Myanmar Name'} *</label>
                  <input
                    type="text"
                    required
                    value={editingHotline.myanmarName}
                    onChange={e => setEditingHotline({ ...editingHotline, myanmarName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="ဥပမာ - အရေးပေါ် ဆေးရုံ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'အင်္ဂလိပ်အမည်' : 'English Label'} *</label>
                  <input
                    type="text"
                    required
                    value={editingHotline.name}
                    onChange={e => setEditingHotline({ ...editingHotline, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    placeholder="e.g. EMERGENCY DISPATCH"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{language === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone Number'} *</label>
                  <input
                    type="text"
                    required
                    value={editingHotline.number}
                    onChange={e => setEditingHotline({ ...editingHotline, number: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold"
                    placeholder="e.g. 192 or 01-256112"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={editingHotline.isPrimary || false}
                  onChange={e => setEditingHotline({ ...editingHotline, isPrimary: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isPrimary" className="text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer">
                  {language === 'my' ? 'အဓိက အရေးပေါ် ဖုန်းနံပါတ်အဖြစ် သတ်မှတ်မည် (Highlight Primary)' : 'Mark as primary emergency hotline'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHotline(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'သိမ်းမည်' : 'Save Hotline'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Hotlines List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {hotlines.map(hotline => (
              <div
                key={hotline.id}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 comfort:bg-[#f2e9d8]/50 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-lg">
                      {hotline.number}
                    </span>
                    <h5 className="font-bold text-xs sm:text-sm text-black dark:text-white">
                      {hotline.myanmarName}
                    </h5>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{hotline.name}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingHotline(hotline); setIsNewHotline(false); }}
                    className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHotline(hotline.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SECTION 5: API KEYS & SYSTEM CONFIG ================= */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white comfort:text-[#231f1a]">
                  {language === 'my' ? 'စနစ် Default API Key စီမံခန့်ခွဲမှု' : 'System Default API Key Management'}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {language === 'my'
                    ? 'အသုံးပြုသူများ ဘက်မှ API Key ရိုက်ထည့်ရန် မလိုအပ်ပါ။ Admin မှ ဤနေရာတွင် စနစ်အတွက် API Key ကို သတ်မှတ်ထားရှိနိုင်ပါသည်။'
                    : 'Users do not need to enter an API key. Admins configure system default API keys here for all AI consultations.'}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold font-myanmar">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'my' ? 'အသုံးပြုသူများ အလိုအလျောက် သုံးစွဲနိုင်သော စနစ် API Key ဖွင့်ထားပါသည်' : 'All users automatically use system default API key'}</span>
            </div>
          </div>

          <form onSubmit={handleSaveApiKeys} className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-5">
            <div>
              <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 font-myanmar">
                {language === 'my' ? 'Gemini API Key (Google AI Studio System Key):' : 'Gemini API Key (Google AI Studio System Key):'}
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={adminGeminiKey}
                  onChange={(e) => setAdminGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-black dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                {language === 'my' ? 'Google AI Studio မှ ရရှိသော API Key ကို ထည့်သွင်းပေးပါ။' : 'Enter system Gemini API Key from Google AI Studio.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 font-myanmar">
                {language === 'my' ? 'OpenRouter API Key (စိတ်ကြိုက် Secondary Provider Key):' : 'OpenRouter API Key (Optional Secondary Provider Key):'}
              </label>
              <div className="relative">
                <input
                  type={showOpenRouterKey ? 'text' : 'password'}
                  value={adminOpenRouterKey}
                  onChange={(e) => setAdminOpenRouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-black dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={handleClearApiKeys}
                className="px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 font-bold text-xs border border-red-200 dark:border-red-900 transition cursor-pointer font-myanmar"
              >
                {language === 'my' ? 'Key ဖျက်မည်' : 'Clear Keys'}
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer font-myanmar"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'my' ? 'API Key များ သိမ်းဆည်းမည်' : 'Save System API Keys'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
