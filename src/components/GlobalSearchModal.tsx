import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Leaf, 
  Activity, 
  PhoneCall, 
  ShieldAlert, 
  ChevronRight, 
  Sparkles
} from 'lucide-react';
import { getManagedHerbs, getManagedSymptoms, getManagedProtocols, getManagedHotlines } from '../lib/contentManager';
import { treatments } from './homeTreatments/data';
import { Herb, EmergencyProtocol, ActiveSection } from '../types';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'my';
  onNavigateSection: (section: ActiveSection) => void;
  onSelectHerb?: (herb: Herb) => void;
  onSelectProtocol?: (protocol: EmergencyProtocol) => void;
}

interface SearchResultItem {
  id: string;
  type: 'herb' | 'remedy' | 'acupoint' | 'protocol' | 'hotline';
  title: string;
  titleMy?: string;
  subtitle: string;
  tag: string;
  icon: React.ReactNode;
  data: any;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  language,
  onNavigateSection,
  onSelectHerb,
  onSelectProtocol
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle Cmd+K / Ctrl+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Index and search items
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const list: SearchResultItem[] = [];

    // 1. Herbs
    const herbs = getManagedHerbs();
    herbs.forEach((herb) => {
      const match =
        herb.myanmarName.toLowerCase().includes(q) ||
        (herb.englishName || '').toLowerCase().includes(q) ||
        (herb.scientificName || '').toLowerCase().includes(q) ||
        (herb.clinicalIndicationMy || '').toLowerCase().includes(q) ||
        (herb.traditionalUsesMy || []).some((u: string) => u.toLowerCase().includes(q));

      if (match) {
        list.push({
          id: `herb-${herb.id}`,
          type: 'herb',
          title: language === 'my' ? herb.myanmarName : (herb.englishName || herb.scientificName),
          titleMy: herb.myanmarName,
          subtitle: `${herb.scientificName} • ${(language === 'my' ? herb.clinicalIndicationMy : herb.clinicalIndication) || ''}`,
          tag: language === 'my' ? 'တိုင်းရင်းဆေးပင်' : 'Herb',
          icon: <Leaf className="w-4 h-4 text-emerald-500" />,
          data: herb
        });
      }
    });

    // 2. Acupressure Treatments
    treatments.forEach((ac) => {
      const match =
        ac.title.toLowerCase().includes(q) ||
        ac.pointName.toLowerCase().includes(q) ||
        ac.location.toLowerCase().includes(q) ||
        ac.benefits.toLowerCase().includes(q);

      if (match) {
        list.push({
          id: `acupoint-${ac.id}`,
          type: 'acupoint',
          title: `${ac.pointName} - ${ac.title}`,
          titleMy: ac.title,
          subtitle: `${language === 'my' ? 'အကျိုးကျေးဇူး:' : 'Benefits:'} ${ac.benefits.slice(0, 70)}...`,
          tag: language === 'my' ? 'လက်နှိပ်ကုထုံး' : 'Acupressure',
          icon: <Activity className="w-4 h-4 text-sky-500" />,
          data: ac
        });
      }
    });

    // 3. Symptoms & Home Remedies
    const symptoms = getManagedSymptoms();
    symptoms.forEach((sym) => {
      const match =
        sym.symptomName.toLowerCase().includes(q) ||
        sym.symptomNameMy.toLowerCase().includes(q) ||
        sym.descriptionMy.toLowerCase().includes(q) ||
        sym.remediesMy.some((r: string) => r.toLowerCase().includes(q));

      if (match) {
        list.push({
          id: `remedy-${sym.id}`,
          type: 'remedy',
          title: language === 'my' ? sym.symptomNameMy : sym.symptomName,
          titleMy: sym.symptomNameMy,
          subtitle: (language === 'my' ? sym.remediesMy : sym.remedies).slice(0, 2).join(' • '),
          tag: language === 'my' ? 'အိမ်တွင်းဆေးနည်း' : 'Remedy',
          icon: <Sparkles className="w-4 h-4 text-amber-500" />,
          data: sym
        });
      }
    });

    // 4. First Aid Protocols
    const protocols = getManagedProtocols();
    protocols.forEach((proto) => {
      const match =
        proto.title.toLowerCase().includes(q) ||
        proto.myanmarTitle.toLowerCase().includes(q) ||
        proto.category.toLowerCase().includes(q) ||
        (proto.steps || []).some((s) => s.title.toLowerCase().includes(q) || s.instruction.toLowerCase().includes(q));

      if (match) {
        list.push({
          id: `protocol-${proto.id}`,
          type: 'protocol',
          title: language === 'my' ? proto.myanmarTitle : proto.title,
          titleMy: proto.myanmarTitle,
          subtitle: language === 'my' ? 'အရေးပေါ် ရှေးဦးပြုစုနည်း အဆင့်ဆင့်' : 'Emergency clinical protocol',
          tag: language === 'my' ? 'ရှေးဦးပြုစုနည်း' : 'First Aid',
          icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
          data: proto
        });
      }
    });

    // 5. Emergency Hotlines
    const hotlines = getManagedHotlines();
    hotlines.forEach((hot) => {
      const match =
        hot.name.toLowerCase().includes(q) ||
        hot.myanmarName.toLowerCase().includes(q) ||
        hot.number.includes(q);

      if (match) {
        list.push({
          id: `hotline-${hot.id}`,
          type: 'hotline',
          title: `${language === 'my' ? hot.myanmarName : hot.name} (${hot.number})`,
          titleMy: hot.myanmarName,
          subtitle: `${language === 'my' ? 'ဖုန်းနံပါတ်:' : 'Dial:'} ${hot.number}`,
          tag: language === 'my' ? 'အရေးပေါ်ဖုန်း' : 'Hotline',
          icon: <PhoneCall className="w-4 h-4 text-emerald-500" />,
          data: hot
        });
      }
    });

    return list.slice(0, 25);
  }, [query, language]);

  const handleSelectItem = (item: SearchResultItem) => {
    onClose();
    if (item.type === 'herb') {
      if (onSelectHerb) {
        onSelectHerb(item.data);
      } else {
        onNavigateSection('plants');
      }
    } else if (item.type === 'acupoint') {
      onNavigateSection('home_treatments');
    } else if (item.type === 'remedy') {
      onNavigateSection('remedies');
    } else if (item.type === 'protocol') {
      if (onSelectProtocol) {
        onSelectProtocol(item.data);
      } else {
        onNavigateSection('symptoms');
      }
    } else if (item.type === 'hotline') {
      onNavigateSection('hotlines');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 z-50 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded4c1] overflow-hidden flex flex-col max-h-[80vh] font-myanmar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-neutral-100 dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              language === 'my'
                ? 'ဆေးပင်၊ ရောဂါလက္ခဏာ၊ ဆေးနည်း၊ လက်နှိပ်ကုထုံး သို့မဟုတ် ဖုန်းနံပါတ် ရှာဖွေပါ...'
                : 'Search herbs, symptoms, remedies, acupressure points, or hotlines...'
            }
            className="flex-1 bg-transparent text-sm sm:text-base text-black dark:text-white comfort:text-[#231f1a] focus:outline-hidden placeholder:text-neutral-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg bg-neutral-200/60 dark:bg-neutral-800 text-[11px] font-mono text-neutral-500 hover:text-black dark:hover:text-white"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
          {query.trim() === '' ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 comfort:text-[#231f1a]">
                {language === 'my' ? 'တစ်နေရာတည်းမှ အားလုံးကို ရှာဖွေပါ' : 'Universal Spotlight Search'}
              </p>
              <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                {language === 'my'
                  ? 'ဥပမာ - ရှားစောင်း၊ နှာစီး၊ ခေါင်းကိုက်၊ PC6၊ 192၊ မီးလောင် ဟု ရိုက်ထည့်ရှာဖွေနိုင်ပါသည်'
                  : 'Try typing aloe, cold, headache, PC6, 192, or burn to search across everything.'}
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                {language === 'my' ? `"${query}" နှင့် သက်ဆိုင်သော အချက်အလက် မတွေ့ရှိပါ` : `No results found for "${query}"`}
              </p>
              <p className="text-xs text-neutral-400">
                {language === 'my' ? 'စာလုံးပေါင်း သို့မဟုတ် အခြားစကားလုံးဖြင့် ထပ်မံရှာဖွေကြည့်ပါ' : 'Please check spelling or try another keyword.'}
              </p>
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="w-full text-left p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 comfort:hover:bg-[#f2e9d8] transition-all flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs sm:text-sm text-neutral-900 dark:text-white comfort:text-[#231f1a] truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded-md font-bold bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Bottom Footer Info */}
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 comfort:border-[#ded4c1] bg-neutral-50 dark:bg-neutral-900/60 comfort:bg-[#f2e9d8] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>{results.length > 0 ? `${results.length} results` : 'Press ESC to close'}</span>
          <span className="hidden sm:inline">Shortcut: ⌘K or Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
