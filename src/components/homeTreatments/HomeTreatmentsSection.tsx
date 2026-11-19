import React, { useState, useEffect, useMemo } from 'react';
import { treatments, Treatment, BodyPart } from './data';
import { 
  GOLDEN_RULES, 
  CUN_MEASUREMENT_GUIDE, 
  SAFETY_WARNINGS, 
  DAILY_ROUTINES, 
  MASSAGE_OILS_GUIDE,
  DailyRoutine
} from './extraTopicsData';
import { AcupressureTimer } from './AcupressureTimer';
import { SocialCardModal } from './SocialCardModal';
import { AmbientSoundPlayer } from './AmbientSoundPlayer';
import { DailyHabitTracker } from './DailyHabitTracker';
import { VipUpgradeModal } from './VipUpgradeModal';
import { ElderlySpeechNarrator } from './ElderlySpeechNarrator';
import { 
  ChevronRight, 
  ArrowLeft, 
  Info, 
  AlertTriangle, 
  Sparkles, 
  LayoutList, 
  Table, 
  Search, 
  Activity, 
  Target, 
  Heart,
  Timer,
  Crosshair,
  ExternalLink,
  ShieldCheck,
  Sun,
  Moon,
  Coffee,
  BookOpen,
  AlertOctagon,
  Droplets,
  Wind,
  Check,
  Clock,
  ShieldAlert,
  Crown,
  Share2,
  Flame,
  Volume2,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeMode } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { toggleBookmark, syncBookmarksWithCloud } from '../../lib/userCloudSync';

interface HomeTreatmentsProps {
  language?: 'en' | 'my';
  themeMode?: ThemeMode;
  onChangeThemeMode?: (mode: ThemeMode) => void;
}

type SectionTab = 'points' | 'routines' | 'guide';
type GuideSubTab = 'rules' | 'cun' | 'safety' | 'oils';

const BODY_PARTS_CONFIG: { id: BodyPart | 'all'; labelMm: string; labelEn: string; image?: string }[] = [
  { id: 'all', labelMm: 'အားလုံး (All)', labelEn: 'All' },
  { id: 'head', labelMm: 'ဦးခေါင်းနှင့် လည်ပင်း', labelEn: 'Head & Neck', image: '/images/home_treatments/realistic_head_1784890965087.jpg' },
  { id: 'torso', labelMm: 'ရင်ဘတ်နှင့် ဝမ်းဗိုက်', labelEn: 'Torso & Abdomen', image: '/images/home_treatments/realistic_torso_1784890977757.jpg' },
  { id: 'arm', labelMm: 'လက်မောင်းနှင့် လက်ဖျံ', labelEn: 'Arm & Forearm', image: '/images/home_treatments/realistic_arm_1784890989805.jpg' },
  { id: 'hand', labelMm: 'လက်ဖဝါးနှင့် လက်ချောင်း', labelEn: 'Hand & Fingers', image: '/images/home_treatments/realistic_hand_1784890944081.jpg' },
  { id: 'leg', labelMm: 'ခြေထောက်နှင့် ဒူးခေါင်း', labelEn: 'Leg & Knee', image: '/images/home_treatments/realistic_leg_1784890999540.jpg' },
  { id: 'foot', labelMm: 'ခြေဖဝါးနှင့် ခြေမျက်စိ', labelEn: 'Foot & Ankle', image: '/images/home_treatments/realistic_foot_1784891010404.jpg' },
];

const BODY_PART_IMAGES: Record<BodyPart, string> = {
  head: '/images/home_treatments/realistic_head_1784890965087.jpg',
  torso: '/images/home_treatments/realistic_torso_1784890977757.jpg',
  arm: '/images/home_treatments/realistic_arm_1784890989805.jpg',
  hand: '/images/home_treatments/realistic_hand_1784890944081.jpg',
  leg: '/images/home_treatments/realistic_leg_1784890999540.jpg',
  foot: '/images/home_treatments/realistic_foot_1784891010404.jpg',
};

const BURMESE_NUMBERS = [
  '၀၁', '၀၂', '၀၃', '၀၄', '၀၅', '၀၆', '၀၇', '၀၈', '၀၉', '၁၀',
  '၁၁', '၁၂', '၁၃', '၁၄', '၁၅', '၁၆', '၁၇', '၁၈', '၁၉', '၂၀',
  '၂၁', '၂၂', '၂၃', '၂၄', '၂၅', '၂၆', '၂၇', '၂၈', '၂၉', '၃၀',
  '၃၁', '၃၂', '၃၃', '၃၄', '၃၅', '၃၆', '၃၇', '၃၈', '၃၉', '၄၀'
];

export const HomeTreatmentsSection: React.FC<HomeTreatmentsProps> = ({ 
  language = 'my',
  themeMode,
  onChangeThemeMode 
}) => {
  // Main Section Navigation Tab: 'points' | 'routines' | 'guide'
  const [activeTab, setActiveTab] = useState<SectionTab>('points');
  const [guideSubTab, setGuideSubTab] = useState<GuideSubTab>('rules');

  // Treatments state
  const [selectedId, setSelectedId] = useState<string>(treatments[0]?.id || '');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'reader'>('reader');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'all'>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [timerTrigger, setTimerTrigger] = useState(0);

  // Active routine selection for routines tab
  const [selectedRoutine, setSelectedRoutine] = useState<DailyRoutine>(DAILY_ROUTINES[0]);

  // Social card and VIP features
  const [isSocialCardOpen, setIsSocialCardOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [isVip, setIsVip] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tm_is_vip') === 'true';
    } catch {
      return false;
    }
  });

  const handleActivateVip = () => {
    setIsVip(true);
    try {
      localStorage.setItem('tm_is_vip', 'true');
    } catch {
      // ignore
    }
  };

  const { user } = useAuth();

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('acupoint-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('acupoint-favorites', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    if (user?.id) {
      syncBookmarksWithCloud(user.id).then((cloudItems) => {
        const acupointIds = cloudItems.filter((b) => b.itemType === 'acupoint').map((b) => b.itemId);
        if (acupointIds.length > 0) {
          setFavorites((prev) => Array.from(new Set([...prev, ...acupointIds])));
        }
      });
    }
  }, [user?.id]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = treatments.find((t) => t.id === id);
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );

    // Sync with User Cloud Bookmarks
    toggleBookmark(user?.id, {
      itemType: 'acupoint',
      itemId: id,
      title: target ? `${target.pointName} - ${target.title}` : id,
      titleMy: target ? `${target.pointName} (${target.title})` : id,
      category: target?.bodyPart || 'acupoint',
      subtitle: target?.location
    });
  };

  const filteredTreatments = useMemo(() => {
    let result = treatments;
    
    if (showFavorites) {
      result = result.filter(t => favorites.includes(t.id));
    }

    if (selectedBodyPart !== 'all') {
      result = result.filter(t => t.bodyPart === selectedBodyPart);
    }
    
    if (!searchQuery.trim()) return result;
    
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(t => 
      t.title.toLowerCase().includes(lowerQuery) || 
      t.pointName.toLowerCase().includes(lowerQuery) ||
      t.benefits.toLowerCase().includes(lowerQuery) ||
      t.location.toLowerCase().includes(lowerQuery) ||
      t.howToFind.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, showFavorites, favorites, selectedBodyPart]);

  const selectedTreatment: Treatment = useMemo(() => {
    return filteredTreatments.find(t => t.id === selectedId) || filteredTreatments[0] || treatments[0];
  }, [filteredTreatments, selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsMobileDetailOpen(true);
  };

  const closeDetail = () => {
    setIsMobileDetailOpen(false);
  };

  useEffect(() => {
    const detailContainer = document.getElementById('home-treatments-detail-container');
    if (detailContainer) {
      detailContainer.scrollTop = 0;
    }
  }, [selectedId]);

  const SelectedIcon = selectedTreatment?.icon || Activity;
  const currentAnatomicalImage = selectedTreatment ? BODY_PART_IMAGES[selectedTreatment.bodyPart] : undefined;

  return (
    <div className="w-full bg-white dark:bg-[#0B0F19] comfort:bg-[#faf6ee] text-neutral-900 dark:text-neutral-100 comfort:text-[#231f1a] min-h-[90vh] flex flex-col font-myanmar selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* Top Banner & Section Navigation Tabs (Streamlined & Clean for Mobile & Desktop) */}
      <div className="w-full border-b border-neutral-200 dark:border-neutral-800 comfort:border-[#e2dacb] bg-neutral-50/95 dark:bg-[#0E1526]/95 comfort:bg-[#f4eee1]/95 backdrop-blur-md sticky top-0 z-20 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 pt-3 sm:pt-4 pb-2 sm:pb-3 flex flex-col gap-2.5 sm:gap-3.5">
          
          {/* Main Title & Action Bar (1-line clean on mobile) */}
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="hidden sm:flex text-[10px] md:text-xs tracking-[0.2em] uppercase font-sans font-black text-emerald-600 dark:text-emerald-400 comfort:text-emerald-700 items-center gap-1.5 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Traditional Healing Series • လက်နှိပ်ကုထုံး</span>
              </div>
              <h1 className="text-base sm:text-2xl md:text-3xl font-black text-neutral-950 dark:text-white comfort:text-[#231f1a] tracking-tight truncate">
                အိမ်တွင်း လက်နှိပ်ကုထုံးများ
              </h1>
            </div>

            {/* Right Action Controls: VIP Badge (Theme switcher hidden on mobile to prevent crowding) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsVipModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-neutral-950 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                title="VIP ကျန်းမာရေး ဝန်ဆောင်မှု ရယူမည်"
              >
                <Crown className="w-3.5 h-3.5 fill-current text-neutral-950" />
                <span>{isVip ? 'VIP' : '⭐ VIP'}</span>
              </button>

              {onChangeThemeMode && themeMode && (
                <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-full bg-white dark:bg-[#151D2E] comfort:bg-[#e9e1d1] border border-neutral-200 dark:border-neutral-700 comfort:border-[#dcd3c1] shadow-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => onChangeThemeMode('light')}
                    className={`p-1 sm:p-1.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-bold transition-all flex items-center cursor-pointer ${
                      themeMode === 'light' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                    title="အလင်းရောင် (Light Theme)"
                  >
                    <Sun className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeThemeMode('comfort')}
                    className={`p-1 sm:p-1.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-bold transition-all flex items-center cursor-pointer ${
                      themeMode === 'comfort' 
                        ? 'bg-[#785b3a] text-white shadow-xs' 
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                    title="သက်တောင့်သက်သာ နို့နှစ်ရောင် (Comfort Theme)"
                  >
                    <Coffee className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeThemeMode('dark')}
                    className={`p-1 sm:p-1.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-bold transition-all flex items-center cursor-pointer ${
                      themeMode === 'dark' 
                        ? 'bg-emerald-500 text-black shadow-xs font-black' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="ညဘက်အမှောင် (Dark Theme)"
                  >
                    <Moon className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Unified Primary Navigation Bar (Responsive 3-Column Grid on Mobile) */}
          <div className="grid grid-cols-3 sm:flex items-center p-1 rounded-2xl bg-neutral-200/70 dark:bg-[#121A2D] comfort:bg-[#e6dece] border border-neutral-300/40 dark:border-neutral-800 text-xs font-bold w-full sm:w-auto self-start">
            <button
              onClick={() => setActiveTab('points')}
              className={`min-h-[44px] flex items-center justify-center gap-1 sm:gap-2 py-2 px-1.5 sm:px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'points'
                  ? 'bg-white dark:bg-[#1C263D] text-emerald-700 dark:text-emerald-400 font-black shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">အကြောဆုံမှတ်များ</span>
              <span className="sm:hidden text-[11px]">ဆုံမှတ်များ</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold">37</span>
            </button>

            <button
              onClick={() => setActiveTab('routines')}
              className={`min-h-[44px] flex items-center justify-center gap-1 sm:gap-2 py-2 px-1.5 sm:px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'routines'
                  ? 'bg-white dark:bg-[#1C263D] text-emerald-700 dark:text-emerald-400 font-black shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">နေ့စဉ် နည်းစဉ် & မှတ်တမ်း</span>
              <span className="sm:hidden text-[11px]">နည်းစဉ်များ</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`min-h-[44px] flex items-center justify-center gap-1 sm:gap-2 py-2 px-1.5 sm:px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'guide'
                  ? 'bg-white dark:bg-[#1C263D] text-emerald-700 dark:text-emerald-400 font-black shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">ကုထုံးလမ်းညွှန် & သတိပြုရန်</span>
              <span className="sm:hidden text-[11px]">လမ်းညွှန်ချက်</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body (Compact padding for mobile) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 md:px-8 py-3 sm:py-6 flex flex-col pb-32">

        {/* ===================== TAB 1: 37 ACUPRESSURE POINTS ===================== */}
        {activeTab === 'points' && (
          <div className="flex flex-col gap-4">
            
            {/* Unified Search & Body Part Filter Hub */}
            <div className="flex flex-col gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-neutral-100/70 dark:bg-[#111A2E]/70 comfort:bg-[#f1ebd9] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2]">
              {/* Row 1: Search + Toggles */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                {/* Search Bar */}
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-emerald-500 transition-colors">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="ဝေဒနာ သို့မဟုတ် အကြောဆုံမှတ် ရှာဖွေရန်... (LI4, ခေါင်းကိုက်)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-[44px] bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] border border-neutral-200 dark:border-neutral-700 comfort:border-[#ded5c2] rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm text-neutral-900 dark:text-white comfort:text-[#231f1a] placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-3 flex items-center text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer px-1"
                    >
                      ရှင်းလင်းရန်
                    </button>
                  )}
                </div>

                {/* Favorites & View Switcher */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                  <button 
                    onClick={() => setShowFavorites(!showFavorites)} 
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95 ${
                      showFavorites 
                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm' 
                        : 'bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] border-neutral-200 dark:border-neutral-700 comfort:border-[#ded5c2] text-neutral-600 dark:text-neutral-300'
                    }`}
                    title="အနှစ်သက်ဆုံး မှတ်သားထားသော ဆုံမှတ်များ"
                  >
                    <Heart className={`w-4 h-4 ${showFavorites ? 'fill-current text-white' : 'text-rose-500'}`} />
                    <span className="text-xs">အနှစ်သက်ဆုံး</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono font-bold">
                      {favorites.length}
                    </span>
                  </button>

                  <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] border border-neutral-200 dark:border-neutral-700 comfort:border-[#ded5c2] shadow-inner">
                    <button 
                      onClick={() => setViewMode('reader')} 
                      className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                        viewMode === 'reader' 
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-xs font-black' 
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                      title="စာဖတ်ပုံစံ"
                    >
                      <LayoutList className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs">စာဖတ်ပုံ</span>
                    </button>
                    <button 
                      onClick={() => setViewMode('table')} 
                      className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                        viewMode === 'table' 
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-xs font-black' 
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                      title="ဇယားပုံစံ"
                    >
                      <Table className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs">ဇယားပုံ</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Body Region Filter Chips (Horizontally Scrollable without wrapping) */}
              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
                <div 
                  className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5 flex-nowrap touch-pan-x [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="tablist"
                  aria-label="Filter by body part"
                >
                  {BODY_PARTS_CONFIG.map((part) => {
                    const count = part.id === 'all' 
                      ? treatments.length 
                      : treatments.filter(t => t.bodyPart === part.id).length;
                    const isSelected = selectedBodyPart === part.id;
                    return (
                      <button
                        key={part.id}
                        onClick={() => setSelectedBodyPart(part.id)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all border shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 font-medium shadow-2xs ${
                          isSelected 
                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black border-emerald-600 dark:border-emerald-400 font-extrabold shadow-xs ring-2 ring-emerald-500/20' 
                            : 'bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                        role="tab"
                        aria-selected={isSelected}
                      >
                        <span>{part.labelMm}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isSelected
                            ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* VIEW MODE: TABLE */}
            {viewMode === 'table' ? (
              <div className="w-full bg-white dark:bg-[#0E1526] comfort:bg-[#fbf7ee] rounded-3xl border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-neutral-100 dark:bg-[#162038] comfort:bg-[#eee6d7] text-neutral-900 dark:text-white comfort:text-[#231f1a] border-b border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] sticky top-0 z-10 text-xs uppercase tracking-wider font-black">
                      <tr>
                        <th className="p-4 w-16 text-center border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2]">စဉ်</th>
                        <th className="p-4 w-1/5 border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2]">ရောဂါဝေဒနာ</th>
                        <th className="p-4 w-1/5 border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2]">Acupoint (အကြောအမှတ်)</th>
                        <th className="p-4 w-1/4 border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2]">တည်နေရာ & ရှာဖွေပုံ</th>
                        <th className="p-4 w-1/4">နှိပ်နည်း & အကျိုးကျေးဇူး</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 comfort:divide-[#ded5c2] text-xs sm:text-sm">
                      {filteredTreatments.length > 0 ? filteredTreatments.map((t, index) => (
                        <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-[#141E34] comfort:hover:bg-[#f4efe4] transition-colors group align-top">
                          <td className="p-4 text-xl font-light opacity-60 text-center border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] text-emerald-600 dark:text-emerald-400 font-mono">
                            {BURMESE_NUMBERS[index] || String(index + 1).padStart(2, '0')}
                          </td>
                          <td className="p-4 border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2]">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-base font-bold text-neutral-950 dark:text-white comfort:text-[#231f1a]">{t.title}</div>
                              <button 
                                onClick={(e) => toggleFavorite(t.id, e)}
                                className={`p-1.5 rounded-full transition-colors cursor-pointer ${favorites.includes(t.id) ? 'text-rose-500 bg-rose-500/10' : 'text-neutral-400 hover:text-rose-500'}`}
                                title="Favorite"
                              >
                                <Heart className={`w-4 h-4 ${favorites.includes(t.id) ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-2">
                              <t.icon className="w-3.5 h-3.5" />
                              <span>{t.bodyPart} region</span>
                            </div>
                          </td>
                          <td className="p-4 border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2]">
                            <div className="flex flex-col gap-2">
                              {t.pointName.split('&').map((pt, i) => {
                                const trimmed = pt.trim();
                                const parts = trimmed.split(' (');
                                const code = parts[0];
                                const names = parts[1] ? parts[1].replace(')', '') : '';
                                const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent('Acupuncture point ' + code)}`;
                                return (
                                  <a 
                                    key={i} 
                                    href={searchUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex flex-col gap-1 items-start bg-neutral-100 dark:bg-[#17223B] comfort:bg-[#eee6d7] border border-neutral-200 dark:border-neutral-700 comfort:border-[#ded5c2] p-2 rounded-xl hover:border-emerald-500 transition-all cursor-pointer group/btn" 
                                    title="Google Images ပေါ်တွင် ပုံရှာဖွေရန်"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-sans text-xs font-black tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md shadow-xs">
                                        {code}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-neutral-400 group-hover/btn:text-emerald-500 transition-colors" />
                                    </div>
                                    {names && <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-sans">{names}</span>}
                                  </a>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-4 leading-relaxed border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] text-neutral-700 dark:text-neutral-300">
                            <p className="mb-2 font-medium">{t.location}</p>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100/60 dark:bg-black/30 comfort:bg-[#eee6d7] p-2 rounded-lg border border-neutral-200/60 dark:border-neutral-800">
                              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">ရှာဖွေပုံ:</strong> {t.howToFind}
                            </div>
                          </td>
                          <td className="p-4 leading-relaxed text-neutral-700 dark:text-neutral-300">
                            <div className="mb-2">
                              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">နှိပ်နည်း:</strong> {t.instructions}
                            </div>
                            <div>
                              <strong className="text-neutral-900 dark:text-white font-bold">အကျိုး:</strong> {t.benefits}
                            </div>
                            {t.warning && (
                              <div className="mt-3 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-1.5 border-t border-rose-200 dark:border-rose-900/50 pt-2 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{t.warning}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-neutral-400 font-sans italic">
                            ရှာဖွေမှုရလဒ် မတွေ့ရှိပါ...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* VIEW MODE: READER (MASTER-DETAIL WITH ANATOMICAL VISUALIZER) */
              <div className="flex-1 flex flex-col md:flex-row h-full min-h-[750px] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-[#0E1526] comfort:bg-[#fbf7ee]">
                
                {/* Left Master List */}
                <div className={`w-full md:w-5/12 lg:w-4/12 border-r border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] flex flex-col ${isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-3 bg-neutral-100/80 dark:bg-[#162038] comfort:bg-[#eee6d7] border-b border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] text-xs font-bold text-neutral-500 dark:text-neutral-400 flex justify-between items-center">
                    <span>ကုထုံးများ ({filteredTreatments.length})</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">ရွေးချယ်ပြီး ဖတ်ရှုပါ</span>
                  </div>
                  <div className="overflow-y-auto max-h-[75vh] divide-y divide-neutral-100 dark:divide-neutral-800 comfort:divide-[#ded5c2]">
                    {filteredTreatments.length > 0 ? filteredTreatments.map((t, index) => {
                      const isSelected = selectedTreatment?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleSelect(t.id)}
                          className={`w-full flex items-start p-4 transition-all cursor-pointer text-left group hover:bg-neutral-50 dark:hover:bg-[#141E34] comfort:hover:bg-[#f4efe4] ${
                            isSelected 
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600 dark:border-l-emerald-400' 
                              : 'bg-transparent border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className={`text-2xl font-light pr-3 transition-opacity shrink-0 font-mono ${isSelected ? 'opacity-100 text-emerald-600 dark:text-emerald-400' : 'opacity-40 text-neutral-400 group-hover:opacity-80'}`}>
                            {BURMESE_NUMBERS[index] || String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className={`text-sm sm:text-base font-bold truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-900 dark:text-white comfort:text-[#231f1a]'}`}>
                                {t.title}
                              </h3>
                              <div 
                                onClick={(e) => toggleFavorite(t.id, e)}
                                className={`shrink-0 p-1 rounded-full transition-colors ${favorites.includes(t.id) ? 'text-rose-500' : 'text-neutral-400 hover:text-rose-500'}`}
                                title="Favorite"
                              >
                                <Heart className={`w-3.5 h-3.5 ${favorites.includes(t.id) ? 'fill-current' : ''}`} />
                              </div>
                            </div>
                            <div className="text-[11px] font-sans text-emerald-600 dark:text-emerald-400 font-bold mb-1 truncate">
                              {t.pointName}
                            </div>
                            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                              {t.benefits}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 ml-1 self-center shrink-0 transition-transform ${isSelected ? 'text-emerald-600 translate-x-1' : 'text-neutral-400 opacity-60'}`} />
                        </button>
                      );
                    }) : (
                      <div className="p-12 text-center text-neutral-400 text-xs italic">
                        ရှာဖွေမှုရလဒ် မတွေ့ရှိပါ...
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Detail & Anatomical Card */}
                <div 
                  id="home-treatments-detail-container"
                  className={`w-full md:w-7/12 lg:w-8/12 overflow-y-auto max-h-[75vh] flex-col ${isMobileDetailOpen ? 'flex' : 'hidden md:flex'}`}
                >
                  {selectedTreatment ? (
                    <div className="flex flex-col min-h-full">
                      {/* Mobile Back Button */}
                      <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-100 dark:bg-[#162038] sticky top-0 z-10 flex items-center justify-between">
                        <button 
                          onClick={closeDetail} 
                          className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>စာရင်းသို့ ပြန်သွားမည်</span>
                        </button>
                        <span className="text-xs text-neutral-500 truncate max-w-[180px]">{selectedTreatment.title}</span>
                      </div>

                      {/* Detail Header */}
                      <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] bg-neutral-50/50 dark:bg-black/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <SelectedIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="text-[10px] font-sans uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-black">
                                အိမ်တွင်း လက်နှိပ်ကုထုံး
                              </span>
                              <h2 className="text-lg sm:text-2xl font-black text-neutral-950 dark:text-white comfort:text-[#231f1a]">
                                {selectedTreatment.title}
                              </h2>
                            </div>
                          </div>

                          {/* Action Toolbar: Compact Icon-only Buttons on mobile with 44px touch targets */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                            <ElderlySpeechNarrator
                              textToRead={`${selectedTreatment.title}။ အကြောဆုံမှတ် ${selectedTreatment.pointName}။ တည်နေရာ ${selectedTreatment.location}။ နှိပ်နယ်နည်း ${selectedTreatment.instructions}။ သက်သာစေနိုင်သော ရောဂါများ ${selectedTreatment.benefits}`}
                              isLargeFont={isLargeFont}
                              onToggleLargeFont={() => setIsLargeFont(prev => !prev)}
                              compact={true}
                            />

                            {/* Secondary Action: Share Social Card */}
                            <button 
                              type="button"
                              onClick={() => setIsSocialCardOpen(true)}
                              className="min-h-[44px] min-w-[44px] h-11 px-3 rounded-xl bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] hover:bg-neutral-100 dark:hover:bg-[#1E293B] text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                              title="Social Card ပုံအဖြစ် မျှဝေမည် (Share)"
                              aria-label="Share as Social Card"
                            >
                              <Share2 className="w-4 h-4 text-sky-500" />
                              <span className="hidden md:inline font-myanmar">မျှဝေမည်</span>
                            </button>

                            {/* Secondary Action: Favorite Button */}
                            <button 
                              type="button"
                              onClick={(e) => toggleFavorite(selectedTreatment.id, e)}
                              className={`min-h-[44px] min-w-[44px] h-11 px-3 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95 ${
                                favorites.includes(selectedTreatment.id) 
                                  ? 'bg-rose-500/15 border-rose-500 text-rose-500' 
                                  : 'bg-white dark:bg-[#17223B] border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-rose-500'
                              }`}
                              title={favorites.includes(selectedTreatment.id) ? "အနှစ်သက်ဆုံးမှ ဖယ်ရှားမည်" : "အနှစ်သက်ဆုံး မှတ်သားမည် (Favorite)"}
                              aria-label="Toggle Favorite"
                            >
                              <Heart className={`w-4 h-4 ${favorites.includes(selectedTreatment.id) ? 'fill-current text-rose-500' : ''}`} />
                            </button>

                            {/* Primary Action: Countdown Timer CTA */}
                            <button
                              type="button"
                              onClick={() => setTimerTrigger(prev => prev + 1)}
                              className="min-h-[44px] h-11 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 shrink-0"
                              title="အချိန်မှတ်စက် စတင်ပါ"
                              aria-label="Start Acupressure Timer"
                            >
                              <Timer className="w-4 h-4 animate-pulse" />
                              <span className="font-myanmar">အချိန်မှတ်စက်</span>
                            </button>
                          </div>
                        </div>

                        {/* Badges for point codes */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-neutral-400 flex items-center gap-1 font-bold">
                            <Target className="w-3.5 h-3.5 text-emerald-500" />
                            အကြောဆုံမှတ်:
                          </span>
                          {selectedTreatment.pointName.split('&').map((pt, i) => {
                            const trimmed = pt.trim();
                            const parts = trimmed.split(' (');
                            const code = parts[0];
                            const names = parts[1] ? parts[1].replace(')', '') : '';
                            const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent('Acupuncture point ' + code)}`;
                            return (
                              <a 
                                key={i} 
                                href={searchUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-2 bg-white dark:bg-[#17223B] comfort:bg-[#fbf7ee] border border-emerald-500/30 hover:border-emerald-500 px-2.5 py-1 rounded-xl transition-all shadow-xs group/tag cursor-pointer"
                                title="Google Images တွင် ပုံရှာဖွေရန် နှိပ်ပါ"
                              >
                                <span className="font-sans text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded shadow-xs">
                                  {code}
                                </span>
                                {names && <span className="text-xs text-neutral-600 dark:text-neutral-300 font-sans">{names}</span>}
                                <ExternalLink className="w-3 h-3 text-neutral-400 group-hover/tag:text-emerald-500 transition-colors" />
                              </a>
                            );
                          })}
                        </div>
                      </div>

                      {/* REALISTIC ANATOMICAL DIAGRAM WITH TARGET PIN */}
                      {currentAnatomicalImage && (
                        <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] bg-neutral-100/50 dark:bg-black/40">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                              <Crosshair className="w-4 h-4" />
                              ခန္ဓာဗေဒ ဆုံမှတ်တည်နေရာပြ ပုံကြမ်း ({selectedTreatment.bodyPart} region)
                            </div>
                            <span className="text-[11px] text-neutral-400 font-sans hidden sm:inline">
                              အမှတ်အဝိုင်းကို နှိပ်လျှင် Google Images သို့ တိုက်ရိုက်ရောက်ပါမည်
                            </span>
                          </div>

                          <div className="relative w-full max-w-lg mx-auto aspect-[16/11] sm:aspect-4/3 max-h-[360px] rounded-2xl overflow-hidden border border-emerald-500/30 shadow-md bg-black">
                            <img 
                              src={currentAnatomicalImage} 
                              alt={`${selectedTreatment.title} - ${selectedTreatment.bodyPart}`}
                              className="w-full h-full object-cover opacity-90 transition-transform duration-500 hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                            {/* Coordinates Pins with Direct Google Images Link */}
                            {selectedTreatment.pointCoordinates && selectedTreatment.pointCoordinates.map((coord, idx) => {
                              const pointCode = selectedTreatment.pointName.split(' ')[0].split('&')[0].trim();
                              const pointSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent('Acupuncture point ' + pointCode)}`;
                              return (
                                <div 
                                  key={idx}
                                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group/pin"
                                  style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                                  onClick={() => window.open(pointSearchUrl, '_blank', 'noopener,noreferrer')}
                                  title={`Google Images ပေါ်တွင် ${pointCode} ၏ ပုံနှင့် တည်နေရာ တိုက်ရိုက်ရှာဖွေရန် နှိပ်ပါ`}
                                >
                                  {/* Glowing Pulse Rings */}
                                  <div className="absolute -inset-3 rounded-full bg-emerald-400/50 animate-ping" />
                                  <div className="absolute -inset-2 rounded-full bg-emerald-500/60 animate-pulse" />
                                  
                                  {/* Center Pin Button */}
                                  <div className="relative w-8 h-8 rounded-full bg-neutral-900 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/80 transition-transform group-hover/pin:scale-125">
                                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                                  </div>

                                  {/* Tooltip Badge */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-md bg-neutral-950/95 border border-emerald-500/50 text-[10px] font-sans font-bold text-emerald-300 whitespace-nowrap shadow-xl pointer-events-none opacity-90 group-hover/pin:opacity-100 transition-opacity flex items-center gap-1">
                                    <span>{pointCode}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </div>
                                </div>
                              );
                            })}

                            <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-xs font-sans text-neutral-200">
                              📍 တည်နေရာ: {selectedTreatment.bodyPart.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step Guidance Cards */}
                      <div className="p-5 sm:p-6 space-y-4">
                        {/* Step 1: Location */}
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#141E34] comfort:bg-[#f4efe4] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] flex flex-col sm:flex-row gap-3 items-start">
                          <div className="flex items-center gap-2 sm:w-1/4 shrink-0 font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-black">၁</span>
                            <span>တည်နေရာ</span>
                          </div>
                          <p className={`flex-1 leading-relaxed text-neutral-700 dark:text-neutral-300 font-medium ${isLargeFont ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                            {selectedTreatment.location}
                          </p>
                        </div>

                        {/* Step 2: How to Find */}
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#141E34] comfort:bg-[#f4efe4] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] flex flex-col sm:flex-row gap-3 items-start">
                          <div className="flex items-center gap-2 sm:w-1/4 shrink-0 font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <Target className="w-5 h-5 text-emerald-500" />
                            <span>ရှာဖွေပုံ</span>
                          </div>
                          <p className={`flex-1 leading-relaxed text-neutral-700 dark:text-neutral-300 font-medium ${isLargeFont ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                            {selectedTreatment.howToFind}
                          </p>
                        </div>

                        {/* Step 3: Instructions & Technique */}
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#141E34] comfort:bg-[#f4efe4] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] flex flex-col sm:flex-row gap-3 items-start">
                          <div className="flex items-center gap-2 sm:w-1/4 shrink-0 font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-black">၂</span>
                            <span>နှိပ်နည်း</span>
                          </div>
                          <p className={`flex-1 leading-relaxed text-neutral-900 dark:text-white font-bold ${isLargeFont ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                            {selectedTreatment.instructions}
                          </p>
                        </div>

                        {/* Step 4: Benefits */}
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#141E34] comfort:bg-[#f4efe4] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] flex flex-col sm:flex-row gap-3 items-start">
                          <div className="flex items-center gap-2 sm:w-1/4 shrink-0 font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                            <span>အကျိုးကျေးဇူး</span>
                          </div>
                          <p className={`flex-1 leading-relaxed text-emerald-700 dark:text-emerald-300 font-medium ${isLargeFont ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                            {selectedTreatment.benefits}
                          </p>
                        </div>

                        {/* Warning Box (if applicable) */}
                        {selectedTreatment.warning && (
                          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row gap-3 items-start">
                            <div className="flex items-center gap-2 sm:w-1/4 shrink-0 font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="w-5 h-5" />
                              <span>သတိပြုရန်</span>
                            </div>
                            <p className="flex-1 text-xs sm:text-sm leading-relaxed text-rose-700 dark:text-rose-300 font-semibold">
                              {selectedTreatment.warning}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-neutral-400">
                      အချက်အလက် ရွေးချယ်ထားခြင်း မရှိပါ
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: 5-MIN DAILY ROUTINES ===================== */}
        {activeTab === 'routines' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div>
              <div className="text-xs uppercase tracking-wider font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4" />
                <span>ရိုးရာ နေ့စဉ် အကြောပြေ နည်းစဉ်တိုများ</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-950 dark:text-white comfort:text-[#231f1a]">
                အချိန်တိုအတွင်း သက်သာစေသော ၅ မိနစ် နည်းစဉ် ၄ ခု
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                မိမိလိုအပ်သော အခြေအနေနှင့်ကိုက်ညီသည့် နည်းစဉ်ကို ရွေးချယ်ပြီး အဆင့်ဆင့် လိုက်နာနှိပ်နယ်နိုင်ပါသည်။
              </p>
            </div>

            {/* Routines Grid Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DAILY_ROUTINES.map((routine) => {
                const isSelected = selectedRoutine.id === routine.id;
                return (
                  <button
                    key={routine.id}
                    onClick={() => setSelectedRoutine(routine)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30' 
                        : 'bg-white dark:bg-[#131B2E] comfort:bg-[#fbf7ee] border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] hover:border-emerald-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          {routine.durationMinutes} မိနစ်
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-emerald-600 translate-x-1' : 'text-neutral-400'}`} />
                      </div>
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white leading-snug">
                        {routine.titleMm.replace(' (၅ မိနစ်)', '')}
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5 line-clamp-2">
                        {routine.suitableForMm}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                      နည်းစဉ် အသေးစိတ်ဖတ်ရန် ➔
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Routine Detail Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-neutral-50 dark:bg-[#121A2D] comfort:bg-[#f5efe3] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] shadow-sm flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    {selectedRoutine.titleEn}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-0.5">
                    {selectedRoutine.titleMm}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {selectedRoutine.suitableForMm}
                  </p>
                </div>
                <button
                  onClick={() => setTimerTrigger(prev => prev + 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Timer className="w-4 h-4" />
                  <span>အချိန်မှတ်စက် စတင်ပါ</span>
                </button>
              </div>

              {/* Soothing Ambient Sound Generator for Routines */}
              <AmbientSoundPlayer />

              {/* Steps Sequence */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  အဆင့်ဆင့် နှိပ်နယ်ရမည့် အကြောမှတ်များနှင့် နည်းလမ်းများ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedRoutine.steps.map((st, sIdx) => {
                    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent('Acupuncture point ' + st.pointCode)}`;
                    return (
                      <div key={sIdx} className="p-4 rounded-2xl bg-white dark:bg-[#18243E] comfort:bg-[#fbf7ee] border border-neutral-200 dark:border-neutral-700/80 shadow-xs flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                              {sIdx + 1}
                            </span>
                            <span className="text-[11px] font-bold text-neutral-400 font-mono">
                              {st.durationMm}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <a 
                              href={searchUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-mono text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1 hover:underline cursor-pointer"
                              title="Google Images ပေါ်တွင် ပုံရှာဖွေရန်"
                            >
                              <span>{st.pointCode}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                              {st.pointNameMm.split(' (')[0]}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mt-2">
                            {st.actionMm}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Benefits list */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-500/30">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  ရရှိမည့် အကျိုးကျေးဇူးများ
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                  {selectedRoutine.benefitsMm.map((ben, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>{ben}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Integrated Daily Habit & Streak Tracker Hub */}
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-6">
                <DailyHabitTracker />

                {/* Commercial VIP Upgrade Banner & Referral Hub */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-600/10 to-yellow-500/15 border-2 border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-neutral-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25 shrink-0">
                      <Crown className="w-7 h-7 fill-current" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white">
                          VIP ကျန်းမာရေး အဖွဲ့ဝင် အဆင့်မြှင့်တင်ပါ
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-neutral-950 uppercase">
                          Premium
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-xl leading-relaxed">
                        AI တိုင်းရင်းဆေး အကြံပေးကို အကန့်အသတ်မဲ့ မေးမြန်းခွင့်၊ သဘာဝတေးသံ အပြည့်အစုံနှင့် တိုင်းရင်းဆေးတိုက်များမှ ၁၅% Discount အထူးအခွင့်အရေးများ ရရှိနိုင်ပါသည်။
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs font-bold text-amber-800 dark:text-amber-300">
                        <span>✓ KBZPay</span>
                        <span>✓ WavePay</span>
                        <span>✓ AYA Pay</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => setIsVipModalOpen(true)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-xs shadow-lg shadow-amber-600/25 transition-all text-center cursor-pointer active:scale-95"
                    >
                      {isVip ? '👑 VIP အချက်အလက်များ' : '⭐ VIP စတင်အသုံးပြုမည်'}
                    </button>
                    <div className="text-[11px] text-center text-neutral-500 dark:text-neutral-400">
                      သူငယ်ချင်း ၃ ဦးကို ဖိတ်ခေါ်ပြီး ၁ လ အခမဲ့ ရယူနိုင်ပါသည်
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: GUIDE & SAFETY HUB ===================== */}
        {activeTab === 'guide' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Guide Sub-Nav Pill Switcher */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setGuideSubTab('rules')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  guideSubTab === 'rules'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>စည်းမျဉ်း ၅ ချက်</span>
              </button>
              <button
                onClick={() => setGuideSubTab('cun')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  guideSubTab === 'cun'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>လက်တိုင်းစနစ် (Cun)</span>
              </button>
              <button
                onClick={() => setGuideSubTab('safety')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  guideSubTab === 'safety'
                    ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                <span>သတိပြုဖွယ်ရာများ</span>
              </button>
              <button
                onClick={() => setGuideSubTab('oils')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  guideSubTab === 'oils'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>သဘာဝ အကြောလိမ်းဆီ</span>
              </button>
            </div>

            {/* Sub-tab 1: 5 Golden Rules */}
            {guideSubTab === 'rules' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                <div>
                  <div className="text-xs uppercase tracking-wider font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>အကြောနှိပ်နည်း အခြေခံ လမ်းညွှန်ချက်များ</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-950 dark:text-white comfort:text-[#231f1a]">
                    အကြောနှိပ်နည်း အခြေခံ ရွှေစည်းမျဉ်း ၅ ချက်
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    ထိရောက်မှုအပြည့်အဝရရှိစေရန်နှင့် ဘေးထွက်ဆိုးကျိုးကင်းစေရန် အောက်ပါစည်းမျဉ်းများကို လိုက်နာပါ
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {GOLDEN_RULES.map((rule) => (
                    <div 
                      key={rule.id}
                      className="p-5 rounded-3xl bg-neutral-50 dark:bg-[#121A2D] comfort:bg-[#f5efe3] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-8 h-8 rounded-2xl bg-emerald-600 text-white font-mono text-sm font-black flex items-center justify-center shadow-xs">
                            {rule.stepNumber}
                          </span>
                          <span className="text-[10px] font-sans uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                            {rule.titleEn}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-neutral-950 dark:text-white leading-snug">
                          {rule.titleMm}
                        </h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mt-2">
                          {rule.detailMm}
                        </p>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        💡 {rule.summaryMm}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 2: Body Cun Measurement Guide */}
            {guideSubTab === 'cun' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                <div>
                  <div className="text-xs uppercase tracking-wider font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Target className="w-4 h-4" />
                    <span>ခန္ဓာကိုယ် လက်တိုင်းနည်းစနစ် (Body Cun Measurement)</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-950 dark:text-white comfort:text-[#231f1a]">
                    လက်ချောင်း အတိုင်းအတာ (ကွန်း / Cun) တိုင်းတာပုံ လမ်းညွှန်
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    လူတစ်ဦးနှင့်တစ်ဦး ခန္ဓာကိုယ်ထွားကြိုင်းပုံ မတူညီသဖြင့် မိမိ၏ လက်ချောင်းအချိုးအစားဖြင့်သာ အကြောမှတ်များကို တိုင်းတာရပါသည်
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                  {CUN_MEASUREMENT_GUIDE.map((cun, idx) => (
                    <div 
                      key={idx}
                      className="p-5 rounded-3xl bg-white dark:bg-[#152038] comfort:bg-[#fbf7ee] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div>
                        <span className="inline-block px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-black font-mono mb-2">
                          {cun.cunValue}
                        </span>
                        <h3 className="font-bold text-sm text-neutral-950 dark:text-white">
                          {cun.titleMm}
                        </h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mt-2 font-medium">
                          {cun.fingerMethodMm}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">
                          {cun.descriptionMm}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block mb-1">အသုံးများသော အမှတ်များ:</span>
                        {cun.examplesMm.map((ex, exIdx) => (
                          <div key={exIdx} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            • {ex}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 3: Safety & Contraindications */}
            {guideSubTab === 'safety' && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-150">
                <div>
                  <div className="text-xs uppercase tracking-wider font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-1">
                    <AlertOctagon className="w-4 h-4" />
                    <span>အန္တရာယ်ကင်းရှင်းရေးနှင့် သတိပြုဖွယ်ရာများ</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-950 dark:text-white comfort:text-[#231f1a]">
                    အထူးရှောင်ကြဉ်ရမည့် အချက်များနှင့် ဆေးပညာဆိုင်ရာ သတိပေးချက်များ
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    အကြောနှိပ်ကုထုံးသည် သဘာဝကုထုံးဖြစ်သော်လည်း အောက်ပါအခြေအနေများတွင် တင်းကြပ်စွာ သတိပြု ရှောင်ကြဉ်ရပါမည်
                  </p>
                </div>

                {/* Pregnancy Mega Warning Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/50 shadow-md flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-7 h-7 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-[11px] font-sans uppercase tracking-widest font-black text-rose-600 dark:text-rose-400">
                        STRICT CONTRAINDICATION
                      </span>
                      <h3 className="text-lg sm:text-xl font-black">
                        ကိုယ်ဝန်ဆောင်မိခင်များ လုံးဝ (လုံးဝ) မနှိပ်ရမည့် အမှတ်များ
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                    အောက်ဖော်ပြပါ အကြောဆုံမှတ်များသည် သားအိမ်ကြွက်သားများကို ချက်ချင်းကျုံ့စေနိုင်သော ပြင်းထန်သည့် စွမ်းအင်စီးဆင်းမှုရှိသဖြင့် ကိုယ်ဝန်ဆောင်ကာလအတွင်း လုံးဝမနှိပ်ရပါ။ မတော်တဆ ဖိနှိပ်မိပါက သွေးဆင်းခြင်း၊ ကလေးစောမွေးခြင်း သို့မဟုတ် ပျက်ကျခြင်း ဖြစ်စေနိုင်ပါသည်။
                  </p>

                  {/* Forbidden Points Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    {[
                      { code: 'LI-4 (Hegu)', nameMm: 'ဟယ်ကု', location: 'လက်မနှင့် လက်ညှိုးကြား' },
                      { code: 'SP-6 (Sanyinjiao)', nameMm: 'ဆန်းယင်းကျောင်း', location: 'ခြေကျင်းဝတ်အတွင်းဘက်' },
                      { code: 'GB-21 (Jianjing)', nameMm: 'ကျန်းကျင်း', location: 'ပခုံးအလယ်တည့်တည့်' },
                      { code: 'BL-60 (Kunlun)', nameMm: 'ခွန်းလွန်', location: 'ခြေကျင်းဝတ်အပြင်ဘက်' },
                    ].map((pt, pIdx) => (
                      <div key={pIdx} className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/50 border border-rose-300 dark:border-rose-800 text-xs">
                        <span className="font-mono text-xs font-black text-rose-700 dark:text-rose-300 block mb-1">
                          ⛔ {pt.code}
                        </span>
                        <span className="font-bold text-neutral-900 dark:text-white block">{pt.nameMm}</span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{pt.location}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Safety Warnings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SAFETY_WARNINGS.filter(w => w.id !== 'warn-pregnancy').map((warn) => (
                    <div 
                      key={warn.id}
                      className="p-5 rounded-3xl bg-neutral-50 dark:bg-[#121A2D] comfort:bg-[#f5efe3] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                          <ShieldAlert className="w-5 h-5 shrink-0" />
                          <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                            {warn.titleMm}
                          </h3>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {warn.descriptionMm}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#18243E] comfort:bg-[#fbf7ee] border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300">
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold block mb-0.5">လိုက်နာရန် လမ်းညွှန်ချက်:</strong>
                        {warn.actionGuidanceMm}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 4: Massage Oils Guide */}
            {guideSubTab === 'oils' && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-150">
                <div>
                  <div className="text-xs uppercase tracking-wider font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Droplets className="w-4 h-4" />
                    <span>သဘာဝ အကြောလိမ်းဆီများနှင့် တွဲဖက်သုံးစွဲပုံ</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-950 dark:text-white comfort:text-[#231f1a]">
                    အကြောနှိပ်ရာတွင် အာနိသင်တိုးစေသော သဘာဝ အကြောလိမ်းဆီများ
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    သင့်လျော်သော သဘာဝအဆီများကို အသုံးပြု၍ နှိပ်နယ်ပါက သွေးလည်ပတ်မှု အဆပေါင်းများစွာ မြန်ဆန်ထိရောက်စေပါသည်
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MASSAGE_OILS_GUIDE.map((oil) => (
                    <div 
                      key={oil.id}
                      className="p-6 rounded-3xl bg-neutral-50 dark:bg-[#121A2D] comfort:bg-[#f5efe3] border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded5c2] shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                              {oil.nameMm}
                            </h3>
                            <span className="text-xs text-neutral-400 font-sans block">{oil.nameEn}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shrink-0">
                            {oil.natureMm}
                          </span>
                        </div>

                        <div className="mb-3 text-xs bg-white dark:bg-[#18243E] comfort:bg-[#fbf7ee] p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700/80">
                          <strong className="text-emerald-600 dark:text-emerald-400 block mb-1">အသင့်တော်ဆုံး ဝေဒနာများ:</strong>
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{oil.bestForMm}</span>
                        </div>

                        <div className="mb-3 text-xs">
                          <strong className="text-neutral-900 dark:text-white block mb-1">အသုံးပြုပုံ နည်းစနစ်:</strong>
                          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">{oil.usageMethodMm}</p>
                        </div>

                        <div>
                          <strong className="text-neutral-900 dark:text-white text-xs block mb-1">အကျိုးကျေးဇူးများ:</strong>
                          <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                            {oil.benefitsMm.map((ben, bIdx) => (
                              <li key={bIdx} className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{ben}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Interactive Acupressure Countdown Timer */}
      <AcupressureTimer 
        activePointName={selectedTreatment?.pointName} 
        forceOpenKey={timerTrigger} 
      />

      {/* Social Media Card Modal */}
      <SocialCardModal
        isOpen={isSocialCardOpen}
        onClose={() => setIsSocialCardOpen(false)}
        treatment={selectedTreatment}
      />

      {/* Commercial VIP Upgrade & Payment Modal */}
      <VipUpgradeModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        isVip={isVip}
        onActivateVip={handleActivateVip}
      />
    </div>
  );
};
