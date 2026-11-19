import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Leaf, 
  ShieldAlert, 
  ChevronRight, 
  X, 
  Copy, 
  Check, 
  Share2,
  Thermometer,
  ArrowRight,
  Stethoscope,
  Heart,
  Wind,
  Utensils,
  Droplets,
  Smile,
  Brain
} from 'lucide-react';
import { CustomSymptomRemedy } from '../types';
import { getManagedSymptoms } from '../lib/contentManager';
import { useAuth } from '../hooks/useAuth';
import { getLocalBookmarks, toggleBookmark, syncBookmarksWithCloud, BookmarkItem } from '../lib/userCloudSync';

export interface SymptomsRemediesProps {
  language: 'en' | 'my';
  onConsultAdvisor?: (prompt: string) => void;
}

const CATEGORIES_CONFIG = [
  { id: 'all', labelMy: 'အားလုံး', labelEn: 'All', Icon: Sparkles },
  { id: 'saved', labelMy: 'သိမ်းထားသည်များ', labelEn: 'Saved', Icon: Heart },
  { id: 'respiratory', labelMy: 'အသက်ရှူလမ်းကြောင်း', labelEn: 'Respiratory', Icon: Wind },
  { id: 'digestive', labelMy: 'အစာခြေစနစ်', labelEn: 'Digestive', Icon: Utensils },
  { id: 'dermatology', labelMy: 'အရေပြား', labelEn: 'Skin', Icon: Droplets },
  { id: 'dental', labelMy: 'သွားနှင့်ခံတွင်း', labelEn: 'Dental', Icon: Smile },
  { id: 'neurological', labelMy: 'ဦးနှောက်နှင့်အာရုံကြော', labelEn: 'Neurology', Icon: Brain },
];

const getCategoryTheme = (category: string) => {
  switch (category) {
    case 'respiratory':
      return {
        Icon: Wind,
        badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
        accentBorder: 'border-l-sky-500',
        pillBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
        iconColor: 'text-sky-500 dark:text-sky-400',
      };
    case 'digestive':
      return {
        Icon: Utensils,
        badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        accentBorder: 'border-l-amber-500',
        pillBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        iconColor: 'text-amber-500 dark:text-amber-400',
      };
    case 'dermatology':
      return {
        Icon: Droplets,
        badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
        accentBorder: 'border-l-purple-500',
        pillBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
        iconColor: 'text-purple-500 dark:text-purple-400',
      };
    case 'dental':
      return {
        Icon: Smile,
        badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
        accentBorder: 'border-l-teal-500',
        pillBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
        iconColor: 'text-teal-500 dark:text-teal-400',
      };
    case 'neurological':
      return {
        Icon: Brain,
        badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
        accentBorder: 'border-l-indigo-500',
        pillBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
        iconColor: 'text-indigo-500 dark:text-indigo-400',
      };
    default:
      return {
        Icon: Leaf,
        badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        accentBorder: 'border-l-emerald-500',
        pillBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        iconColor: 'text-emerald-500 dark:text-emerald-400',
      };
  }
};

export const SymptomsRemedies: React.FC<SymptomsRemediesProps> = ({ 
  language,
  onConsultAdvisor
}) => {
  const { user } = useAuth();
  const [allSymptoms, setAllSymptoms] = useState<CustomSymptomRemedy[]>(() => getManagedSymptoms());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    const list = getLocalBookmarks();
    return new Set(list.filter(b => b.itemType === 'remedy').map(b => b.itemId));
  });

  useEffect(() => {
    const handleUpdate = () => {
      setAllSymptoms(getManagedSymptoms());
    };
    window.addEventListener('tmhip_content_updated', handleUpdate);
    return () => window.removeEventListener('tmhip_content_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (user?.id) {
      syncBookmarksWithCloud(user.id).then((cloudList) => {
        setBookmarkedIds(new Set(cloudList.filter(b => b.itemType === 'remedy').map(b => b.itemId)));
      });
    }

    const handleSync = (e: any) => {
      const items: BookmarkItem[] = e.detail || getLocalBookmarks();
      setBookmarkedIds(new Set(items.filter(b => b.itemType === 'remedy').map(b => b.itemId)));
    };
    window.addEventListener('showcare_bookmarks_changed', handleSync);
    return () => window.removeEventListener('showcare_bookmarks_changed', handleSync);
  }, [user?.id]);

  const handleToggleBookmark = async (item: CustomSymptomRemedy) => {
    const { isBookmarked } = await toggleBookmark(user?.id, {
      itemType: 'remedy',
      itemId: item.id,
      title: item.symptomName,
      titleMy: item.symptomNameMy,
      category: item.category,
      subtitle: item.descriptionMy
    });

    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  };

  const handleCopyRemedies = (item: CustomSymptomRemedy) => {
    const title = language === 'my' ? item.symptomNameMy : item.symptomName;
    const remedies = (language === 'my' ? item.remediesMy : item.remedies).join('\n• ');
    const textToCopy = `【${title} - သဘာဝ ဆေးနည်းများ】\n• ${remedies}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredList = allSymptoms.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.symptomNameMy.toLowerCase().includes(q) ||
      item.symptomName.toLowerCase().includes(q) ||
      item.descriptionMy.toLowerCase().includes(q) ||
      item.remediesMy.some((r) => r.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'saved'
        ? bookmarkedIds.has(item.id)
        : item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6 font-myanmar animate-in fade-in duration-200">
      
      {/* Sleek Modern Clinical Header (Lightweight & Mobile-Optimized) */}
      <div className="p-4 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white shadow-lg relative overflow-hidden">
        {/* Background Decorative Rings */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-12 w-36 h-36 rounded-full bg-teal-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold backdrop-blur-md">
              <Activity className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              <span>{language === 'my' ? 'အိမ်တွင်း ရှေးဦးပြုစုကုသမှု' : 'First Aid & Natural Care'}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-black/25 text-emerald-200 border border-white/10">
              {allSymptoms.length} {language === 'my' ? 'မျိုး စုစည်းထားပါသည်' : 'Conditions'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {language === 'my' ? 'ရောဂါလက္ခဏာ နှင့် သဘာဝဆေးနည်းများ' : 'Symptoms & Home Remedies'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            {language === 'my'
              ? 'နှာစီး၊ ချောင်းဆိုး၊ ဗိုက်အောင့်၊ အရေပြား၊ သွားကိုက်၊ ခေါင်းကိုက် စသည့် အဖြစ်များသော ဝေဒနာများအတွက် လက်တွေ့အိမ်တွင်း သဘာဝကုထုံးများ။'
              : 'Safe, natural remedies and emergency clinical warnings for runny nose, cough, stomach pain, rashes, toothache, and headache.'}
          </p>
        </div>
      </div>

      {/* Search & Category Filter Hub */}
      <div className="space-y-3">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'my'
                ? 'ရောဂါလက္ခဏာ သို့မဟုတ် ဆေးနည်း ရှာဖွေပါ (ဥပမာ - နှာစီး၊ ချောင်းဆိုး၊ ခေါင်းကိုက်)...'
                : 'Search symptom or remedy (e.g. cold, cough, headache)...'
            }
            className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-neutral-900 comfort:bg-[#fbf7ee] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] text-xs sm:text-sm text-neutral-900 dark:text-white comfort:text-[#231f1a] placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 flex-nowrap touch-pan-x [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES_CONFIG.map((cat) => {
            const count = cat.id === 'all'
              ? allSymptoms.length
              : cat.id === 'saved'
              ? allSymptoms.filter((s) => bookmarkedIds.has(s.id)).length
              : allSymptoms.filter((s) => s.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black border-transparent shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-neutral-900 comfort:bg-[#fbf7ee] border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400'
                }`}
                type="button"
              >
                <cat.Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white dark:text-black' : 'text-neutral-500 dark:text-neutral-400'}`} />
                <span>{language === 'my' ? cat.labelMy : cat.labelEn}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-white/25 dark:bg-black/25 text-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Symptoms Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredList.map((item) => {
          const theme = getCategoryTheme(item.category);
          const remedies = language === 'my' ? item.remediesMy : item.remedies;
          const precautions = language === 'my' ? item.precautionsMy : item.precautions;

          return (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 comfort:bg-[#fbf7ee] border border-neutral-200/80 dark:border-neutral-800 comfort:border-[#ded5c2] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 border-l-4 ${theme.accentBorder}`}
            >
              <div className="space-y-3.5">
                {/* Header: Category Icon + Title + Category Badge */}
                <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-neutral-100 dark:border-neutral-800/80 comfort:border-[#ded5c2]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-2xs">
                      <theme.Icon className={`w-5 h-5 ${theme.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-neutral-950 dark:text-white comfort:text-[#231f1a] truncate leading-tight">
                        {language === 'my' ? item.symptomNameMy : item.symptomName}
                      </h3>
                      <span className={`inline-block mt-0.5 px-2 py-0.2 rounded-md text-[10px] font-bold border ${theme.badge}`}>
                        {language === 'my' ? item.categoryMy : item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Cloud Bookmark Heart Button */}
                    <button
                      onClick={() => handleToggleBookmark(item)}
                      className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      title={bookmarkedIds.has(item.id) ? (language === 'my' ? 'သိမ်းထားခြင်းမှ ဖယ်ရှားမည်' : 'Remove bookmark') : (language === 'my' ? 'ဆေးနည်း မှတ်သားမည်' : 'Bookmark remedy')}
                      type="button"
                    >
                      <Heart
                        className={`w-4 h-4 transition-all ${
                          bookmarkedIds.has(item.id)
                            ? 'text-rose-500 fill-rose-500 scale-110'
                            : 'text-neutral-400 hover:text-rose-500'
                        }`}
                      />
                    </button>

                    {/* 1-Click Copy Button */}
                    <button
                      onClick={() => handleCopyRemedies(item)}
                      className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Copy remedies"
                      type="button"
                    >
                      {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {language === 'my' ? item.descriptionMy : item.description}
                </p>

                {/* Natural Home Remedies Checklist */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    <Leaf className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'သဘာဝ အိမ်တွင်းဆေးနည်းများ:' : 'Natural Remedies:'}</span>
                  </div>

                  <ul className="space-y-2 text-xs text-neutral-800 dark:text-neutral-200 comfort:text-[#231f1a]">
                    {remedies.map((rem, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                        <span className="flex-1">{rem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Precautions Alert Card */}
                {precautions && precautions.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 mt-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{language === 'my' ? 'သတိပြုရန်များ:' : 'Precautions:'}</span>
                    </div>
                    <ul className="list-disc list-inside text-amber-900 dark:text-amber-200 space-y-0.5 text-[11px] leading-relaxed pl-1">
                      {precautions.map((p, pIdx) => (
                        <li key={pIdx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Button: Consult AI Doctor */}
              {onConsultAdvisor && (
                <button
                  type="button"
                  onClick={() =>
                    onConsultAdvisor(
                      `ရောဂါလက္ခဏာ: ${item.symptomNameMy} အတွက် အိမ်တွင်းဆေးနည်းများနှင့် အပိုဆောင်း သတိပြုရန်များ ရှင်းပြပေးပါ`
                    )
                  }
                  className="w-full mt-3 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 border border-neutral-200/60 dark:border-neutral-700/60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'my' ? 'AI ဆရာဝန်နှင့် မေးမြန်းမည်' : 'Ask AI Doctor'}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 ml-auto" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredList.length === 0 && (
        <div className="py-12 text-center space-y-3">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            {language === 'my' 
              ? 'ရှာဖွေထားသော ရောဂါလက္ခဏာ မတွေ့ရှိပါ။' 
              : 'No matching symptoms or remedies found.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            {language === 'my' ? 'အားလုံး ပြန်ကြည့်မည်' : 'Reset Filters'}
          </button>
        </div>
      )}

    </div>
  );
};

export default SymptomsRemedies;
