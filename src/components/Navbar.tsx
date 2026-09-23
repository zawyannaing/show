import React, { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Coffee,
  Languages, 
  PhoneCall, 
  Bot, 
  BookOpen, 
  HeartPulse, 
  Home, 
  Phone,
  Menu,
  X,
  Type,
  Activity,
  ChevronRight,
  Sparkles,
  Table,
  Check,
  Newspaper,
  UploadCloud,
  FileText,
  Thermometer,
  Leaf
} from 'lucide-react';
import { ActiveSection, ThemeMode, FontSize } from '../types';
import { LoginButton } from './LoginButton';

interface NavbarProps {
  themeMode: ThemeMode;
  onChangeThemeMode: (mode: ThemeMode) => void;
  fontSize: FontSize;
  onChangeFontSize: (size: FontSize) => void;
  language: 'en' | 'my';
  onToggleLanguage: () => void;
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  onOpenCatalog?: () => void;
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  themeMode,
  onChangeThemeMode,
  fontSize,
  onChangeFontSize,
  language,
  onToggleLanguage,
  activeSection,
  onSelectSection,
  onOpenCatalog,
  onOpenChat,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: { 
    id: ActiveSection; 
    labelEn: string; 
    labelMy: string; 
    shortEn: string;
    shortMy: string;
    descEn: string;
    descMy: string;
    icon: React.ReactNode; 
    isBadge?: boolean;
    badgeText?: string;
  }[] = [
    {
      id: 'overview',
      labelEn: 'Community Bulletins & Posts',
      labelMy: 'ကျန်းမာရေး သတင်းလွှာနှင့် ပို့စ်များ',
      shortEn: 'Home',
      shortMy: 'ပင်မ သတင်းလွှာ',
      descEn: 'Live community posts & daily medical bulletins',
      descMy: 'တိုက်ရိုက်လွှင့်တင် ပို့စ်များနှင့် နေ့စဉ် ကျန်းမာရေး သတင်းလွှာများ',
      icon: <Home className="w-4 h-4 text-emerald-600" />,
      isBadge: true,
      badgeText: 'Live',
    },

    {
      id: 'remedies',
      labelEn: 'Symptoms & Home Remedies',
      labelMy: 'ရောဂါလက္ခဏာများ',
      shortEn: 'Remedies',
      shortMy: 'ရောဂါလက္ခဏာ',
      descEn: 'Home remedies for runny nose, cough, stomach ache, skin, toothache & headache',
      descMy: 'နှာစီး၊ ချောင်းဆိုး၊ ဗိုက်အောင့်၊ အရေပြား၊ သွားကိုက်၊ ခေါင်းကိုက် သဘာဝ ဆေးနည်းများ',
      icon: <Thermometer className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      isBadge: true,
      badgeText: 'Remedies',
    },
    {
      id: 'plants',
      labelEn: 'Natural Medicinal Herbs Directory',
      labelMy: 'သဘာဝဆေးဖက်ဝင်အပင်များ',
      shortEn: 'Herbs',
      shortMy: 'ဆေးဖက်ဝင်အပင်',
      descEn: '120+ botanical monographs, active compounds & preparation guides',
      descMy: 'အသိအမှတ်ပြု ဆေးဖက်ဝင်အပင် ၁၂၀+ နှင့် ဓာတုဒြပ်ပေါင်း၊ သောက်သုံးနည်းများ',
      icon: <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      isBadge: true,
      badgeText: '120+',
    },
    {
      id: 'symptoms',
      labelEn: 'First Aid Emergency Protocols',
      labelMy: 'ရှေးဦးသူနာပြု',
      shortEn: 'First Aid',
      shortMy: 'ရှေးဦးသူနာပြု',
      descEn: 'Emergency triage for burns, snakebites, fevers & cardiac care',
      descMy: 'မီးလောင်၊ မြွေကိုက်၊ ဖျားနာ၊ နှလုံးရပ် အရေးပေါ် အသက်ကယ်အဆင့်ဆင့် လမ်းညွှန်',
      icon: <HeartPulse className="w-4 h-4 text-red-500" />,
      isBadge: true,
      badgeText: 'ER',
    },
    {
      id: 'hotlines',
      labelEn: 'Emergency Hotlines & Hospitals',
      labelMy: 'အရေးပေါ်ဖုန်းများနှင့် ဆေးရုံများ',
      shortEn: 'Hotlines',
      shortMy: 'ဖုန်းများ',
      descEn: 'Direct 1-tap dispatch for Ambulance 192, Fire 191 & major hospitals',
      descMy: 'လူနာတင်ယာဉ် ၁၉၂၊ မီးသတ် ၁၉၁ နှင့် မြန်မာနိုင်ငံ အဓိက ဆေးရုံကြီးများ',
      icon: <Phone className="w-4 h-4 text-sky-500" />,
    },
    {
      id: 'assistant',
      labelEn: 'Home Treatment Advisor',
      labelMy: 'အိမ်တွင်းကုသမှုအကြံပေး',
      shortEn: 'Advisor',
      shortMy: 'အကြံပေး',
      descEn: 'Search medicines, symptoms, medicine photo scanning & history',
      descMy: 'ဆေးဝါး၊ ရောဂါလက္ခဏာများ ရှာဖွေခြင်း၊ ဓာတ်ပုံစစ်ဆေးခြင်းနှင့် မှတ်တမ်း',
      icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      isBadge: true,
      badgeText: 'AI',
    },
    {
      id: 'admin',
      labelEn: 'Admin Panel & Sections',
      labelMy: 'စီမံခန့်ခွဲမှုနှင့် ပို့စ်တင်ရန် (Admin Panel)',
      shortEn: 'Admin',
      shortMy: 'စီမံခန့်ခွဲ',
      descEn: 'Manage remedies, plants, first aid, hotlines & upload Supabase posts',
      descMy: 'ဆေးနည်း၊ ဆေးပင်၊ ရှေးဦးပြုစုနည်း၊ ဖုန်းနံပါတ်များနှင့် ပို့စ်များကို စီမံပြင်ဆင်ရန်',
      icon: <UploadCloud className="w-4 h-4 text-emerald-500" />,
      isBadge: true,
      badgeText: 'Admin',
    },
  ];

  const fontSizes: { key: FontSize; label: string; descEn: string; descMy: string }[] = [
    { key: 'sm', label: 'A-', descEn: 'Compact (14px)', descMy: 'အသေး' },
    { key: 'base', label: 'A', descEn: 'Normal (16px)', descMy: 'ပုံမှန်' },
    { key: 'lg', label: 'A+', descEn: 'Large (18px) • 40+', descMy: 'ကြီးမား (၄၀+)' },
    { key: 'xl', label: 'A++', descEn: 'Extra Large (21px)', descMy: 'အကြီးဆုံး' },
  ];

  const handleComfortToggle = () => {
    if (themeMode === 'comfort') {
      onChangeThemeMode('light');
    } else {
      onChangeThemeMode('comfort');
    }
  };

  return (
    <>
      {/* Top Header: ONLY 2 BUTTONS ON RIGHT (Language Button & Menu Bar Button) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-950/95 comfort:bg-[#faf6ee]/95 backdrop-blur-md border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity (SHOW CARE MYANMAR) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                onSelectSection('overview');
                setMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
              id="tmhip-logo-btn"
              type="button"
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Leaf className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base sm:text-lg tracking-tight leading-none bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent animate-pulse">
                    SHOW CARE MYANMAR
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 comfort:text-emerald-900 font-bold leading-tight font-myanmar hidden xs:block truncate">
                  {language === 'my' ? 'သဘာဝဆေးနှင့် ကျန်းမာရေး လမ်းညွှန်' : 'Health & Home Treatment Guide'}
                </span>
              </div>
            </button>
          </div>

          {/* Right: STRICTLY ONLY 2 BUTTONS (Language Button & Menu Bar Button) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* BUTTON 1: Language Button (EN / မြန်မာ) */}
            <button
              onClick={onToggleLanguage}
              className="h-10 px-3 sm:px-4 rounded-full bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white comfort:text-[#231f1a] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] shadow-2xs"
              type="button"
              id="top-language-toggle-btn"
              title={language === 'en' ? 'Switch to Myanmar Unicode (မြန်မာဘာသာ)' : 'Switch to English'}
              aria-label="Toggle language: EN / MY"
            >
              <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-extrabold whitespace-nowrap">{language === 'en' ? 'EN' : 'မြန်မာ'}</span>
            </button>

            {/* BUTTON 2: Menu Bar Button (Menu / မီနူး) */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`h-10 px-3.5 sm:px-4 rounded-full flex items-center gap-2 cursor-pointer border transition-all text-xs font-bold shadow-2xs ${
                menuOpen
                  ? 'bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] border-transparent shadow-sm'
                  : 'bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] hover:opacity-90 border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1]'
              }`}
              aria-label="Open menu bar with all controls"
              id="top-menu-bar-btn"
              type="button"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="font-myanmar font-bold whitespace-nowrap">
                {language === 'my' ? 'မီနူး' : 'Menu'}
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* Slide-over / Modal Menu Bar: ALL BUTTONS KEEP UP HERE */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="menu-bar-modal">
          {/* Backdrop Scrim */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Bar Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-3 sm:pl-10 z-50">
            <div className="w-[90vw] sm:w-screen max-w-xs sm:max-w-md bg-white dark:bg-neutral-950 comfort:bg-[#faf6ee] shadow-2xl flex flex-col justify-between border-l border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] animate-in slide-in-from-right duration-200">
              
              {/* Drawer Top Header */}
              <div className="p-4 sm:p-5 border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 comfort:bg-[#f2e9d8]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 bg-black dark:bg-white comfort:bg-[#231f1a] text-white dark:text-black comfort:text-[#faf6ee] rounded-xl flex items-center justify-center font-extrabold text-sm shadow-xs">
                    +
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-black dark:text-white comfort:text-[#231f1a] tracking-tight font-myanmar">
                      {language === 'my' ? 'မီနူးနှင့် ထိန်းချုပ်ခလုတ်များ' : 'Menu Bar & Action Controls'}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 comfort:text-[#645a4e] font-myanmar">
                      {language === 'my' ? 'ကဏ္ဍများနှင့် အရေးပေါ် ထိန်းချုပ်မှုများ' : 'Quick accessibility & section navigation'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-white dark:bg-neutral-800 comfort:bg-[#faf6ee] hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-black dark:text-white comfort:text-[#231f1a] transition-colors border border-border-subtle dark:border-neutral-700 cursor-pointer shadow-2xs"
                  aria-label="Close menu bar"
                  id="close-menu-bar-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Scrollable Content: All Buttons Kept Up Here */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">

                {/* 1. Quick Action & Accessibility Bar (Font Size, Comfort, Emergency 192, Theme) */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 comfort:text-[#8c7e6d] uppercase tracking-wider font-myanmar">
                    {language === 'my' ? 'အမြန် ထိန်းချုပ်ခလုတ်များ' : 'Quick Actions & Accessibility'}
                  </div>

                  {/* Priority Emergency 192 Button */}
                  <a
                    href="tel:192"
                    id="menu-emergency-192-btn"
                    className="w-full p-3 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold flex items-center justify-between shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <PhoneCall className="w-4 h-4 animate-pulse text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-black font-myanmar">
                          {language === 'my' ? 'လူနာတင်ယာဉ် ၁၉၂ ခေါ်မည်' : 'Dial Ambulance 192'}
                        </div>
                        <div className="text-[10px] text-red-100 font-normal">
                          {language === 'my' ? '၂၄ နာရီ တစ်နိုင်ငံလုံး အခမဲ့' : '24/7 Nationwide Emergency Toll-Free'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white text-red-600 text-xs font-black">
                      192
                    </span>
                  </a>

                  {/* A- A+ Font Size Selector Row */}
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-900 comfort:bg-[#f2e9d8] rounded-2xl border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-black dark:text-white comfort:text-[#231f1a]">
                      <span className="flex items-center gap-1.5 font-myanmar">
                        <Type className="w-3.5 h-3.5" />
                        <span>{language === 'my' ? 'စာလုံး အရွယ်အစား (A- A+)' : 'Font Size Scaler'}</span>
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-neutral-800 comfort:bg-[#faf6ee] border border-border-subtle dark:border-neutral-700">
                        {fontSize === 'sm' ? 'A- (14px)' : fontSize === 'base' ? 'A (16px)' : fontSize === 'lg' ? 'A+ (18px)' : 'A++ (21px)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {fontSizes.map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => onChangeFontSize(f.key)}
                          className={`py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                            fontSize === f.key
                              ? 'bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] border-transparent shadow-xs'
                              : 'bg-white dark:bg-neutral-800 comfort:bg-[#faf6ee] text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] hover:bg-neutral-200 dark:hover:bg-neutral-700 border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eye-Comfort Reading Mode & Appearance Toggle Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleComfortToggle}
                      className={`p-3 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer text-left ${
                        themeMode === 'comfort'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-900 comfort:bg-[#f2e9d8] text-black dark:text-white comfort:text-[#231f1a] hover:bg-neutral-200 dark:hover:bg-neutral-800 border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]'
                      }`}
                      id="menu-comfort-btn"
                    >
                      <Coffee className={`w-4 h-4 mb-2 ${themeMode === 'comfort' ? 'text-amber-100' : 'text-amber-600'}`} />
                      <div>
                        <div className="text-xs font-extrabold font-myanmar leading-tight">
                          {language === 'my' ? 'မျက်စိအေး စာဖတ်စနစ်' : 'Comfort Mode'}
                        </div>
                        <div className={`text-[10px] mt-0.5 font-myanmar ${themeMode === 'comfort' ? 'text-amber-100' : 'text-neutral-500 dark:text-neutral-400'}`}>
                          {themeMode === 'comfort' ? (language === 'my' ? 'အသုံးပြုနေသည်' : 'Active') : (language === 'my' ? 'နွေးထွေးသော စာရွက်ရောင်' : 'Warm Paper')}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onChangeThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                      className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 comfort:bg-[#f2e9d8] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-black dark:text-white comfort:text-[#231f1a] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex flex-col justify-between transition-all cursor-pointer text-left"
                      id="menu-theme-btn"
                    >
                      {themeMode === 'dark' ? (
                        <Moon className="w-4 h-4 text-purple-400 mb-2" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500 mb-2" />
                      )}
                      <div>
                        <div className="text-xs font-extrabold leading-tight font-myanmar">
                          {themeMode === 'dark' 
                            ? (language === 'my' ? 'အမှောင်စနစ်' : 'Dark Mode') 
                            : (language === 'my' ? 'အလင်းစနစ်' : 'Light Mode')}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-myanmar">
                          {themeMode === 'dark' 
                            ? (language === 'my' ? 'အသုံးပြုနေသည်' : 'Active') 
                            : (language === 'my' ? 'မူလအလင်း' : 'Standard')}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. All Platform Section Navigation Buttons */}
                <div className="space-y-2 pt-2 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
                  <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 comfort:text-[#8c7e6d] uppercase tracking-wider font-myanmar">
                    {language === 'my' ? 'ကျန်းမာရေး ကဏ္ဍများ' : 'Platform Navigation'}
                  </div>

                  <div className="space-y-1.5">
                    {navItems.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectSection(item.id);
                            setMenuOpen(false);
                          }}
                          className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] border-transparent shadow-sm'
                              : 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-black dark:text-white comfort:text-[#231f1a]'
                          }`}
                          id={`menu-section-${item.id}`}
                          type="button"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black comfort:text-[#faf6ee]'
                                : 'bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] text-black dark:text-white comfort:text-[#231f1a]'
                            }`}>
                              {item.icon}
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm font-myanmar">
                                  {language === 'my' ? item.labelMy : item.labelEn}
                                </span>
                                {item.badgeText && (
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    isActive ? 'bg-amber-400 text-black' : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                  }`}>
                                    {item.badgeText}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] leading-snug font-myanmar ${
                                isActive ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-500 dark:text-neutral-400'
                              }`}>
                                {language === 'my' ? item.descMy : item.descEn}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-white dark:text-black' : 'text-neutral-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Special Quick Action Launchers (Catalog & AI Assistant) */}
                <div className="pt-2 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] space-y-2">
                  <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 comfort:text-[#8c7e6d] uppercase tracking-wider font-myanmar">
                    {language === 'my' ? 'အထူးဝန်ဆောင်မှုများ' : 'Special Modals'}
                  </div>

                  {onOpenCatalog && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCatalog();
                        setMenuOpen(false);
                      }}
                      className="w-full p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 comfort:text-emerald-950 text-xs font-bold flex items-center justify-between font-myanmar cursor-pointer transition-colors"
                      id="menu-open-catalog-btn"
                    >
                      <div className="flex items-center gap-2.5">
                        <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{language === 'my' ? 'ဆေးကျမ်းအပင် ၁၂၀+ ဇယားဖွင့်ရန်' : 'Open 120+ Botanical Catalog'}</span>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  )}

                  {onOpenChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChat();
                        setMenuOpen(false);
                      }}
                      className="w-full p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/30 text-purple-950 dark:text-purple-200 comfort:text-purple-950 text-xs font-bold flex items-center justify-between font-myanmar cursor-pointer transition-colors"
                      id="menu-open-ai-btn"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>{language === 'my' ? 'ဆေးပညာ AI နှင့် တိုက်ရိုက်ဆွေးနွေးရန်' : 'Consult Clinical AI Doctor'}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-600" />
                    </button>
                  )}
                </div>

              </div>

              {/* Drawer Bottom Footer */}
              <div className="p-4 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] bg-neutral-50 dark:bg-neutral-900 comfort:bg-[#f2e9d8] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-myanmar">
                <span>TMHIP 40+ Senior Care</span>
                <span>{language === 'my' ? 'မြန်မာဘာသာ အပြည့်အစုံ' : 'Verified Clinical System'}</span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Persistent Clean Mobile Bottom Navigation Dock */}
      <nav 
        className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-950/95 comfort:bg-[#faf6ee]/95 backdrop-blur-xl border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] px-1 py-1 shadow-lg transition-colors"
        aria-label="Mobile Bottom Navigation Dock"
        id="mobile-bottom-menu-bar"
      >
        <div className="grid grid-cols-6 gap-0.5 max-w-lg mx-auto">
          {navItems.slice(0, 6).map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  setMenuOpen(false);
                }}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer relative min-h-[48px] ${
                  isActive
                    ? 'text-black dark:text-white comfort:text-[#231f1a] font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 comfort:text-[#645a4e] hover:text-black dark:hover:text-white'
                }`}
                id={`bottom-nav-${item.id}`}
                type="button"
                title={language === 'my' ? item.labelMy : item.labelEn}
              >
                {isActive && (
                  <span className="absolute top-0.5 w-6 h-1 rounded-full bg-black dark:bg-white comfort:bg-[#231f1a]"></span>
                )}

                <div className={`p-0.5 transition-transform ${isActive ? 'scale-105' : 'scale-100'}`}>
                  {item.icon}
                </div>

                <span className="text-[10px] leading-tight text-center font-myanmar truncate max-w-full">
                  {language === 'my' ? item.shortMy : item.shortEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
