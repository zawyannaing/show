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
  Leaf,
  ShieldCheck,
  User,
  LogIn,
  Smartphone,
  Download,
  Search,
  WifiOff
} from 'lucide-react';
import { ActiveSection, ThemeMode, FontSize } from '../types';
import { LoginButton } from './LoginButton';
import { useAuth } from '../hooks/useAuth';
import { isPwaStandalone, promptPwaInstall } from '../lib/pwaHelper';

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
  onOpenSearch?: () => void;
  onOpenOfflinePack?: () => void;
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
  onOpenSearch,
  onOpenOfflinePack,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAdmin } = useAuth();

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
      shortMy: 'ပင်မ',
      descEn: 'Live community posts & daily medical bulletins',
      descMy: 'တိုက်ရိုက်လွှင့်တင် ပို့စ်များနှင့် နေ့စဉ် ကျန်းမာရေး သတင်းလွှာများ',
      icon: <Home className="w-4 h-4 text-emerald-600" />,
      isBadge: true,
      badgeText: 'Live',
    },
    {
      id: 'assistant',
      labelEn: 'AI Doctor & Home Treatment Advisor',
      labelMy: 'AI ဆရာဝန်နှင့် အိမ်တွင်းကုသမှုအကြံပေး',
      shortEn: 'AI Doctor',
      shortMy: 'AI ဆရာဝန်',
      descEn: 'Search medicines, symptoms, medicine photo scanning & history',
      descMy: 'ဆေးဝါး၊ ရောဂါလက္ခဏာများ ရှာဖွေခြင်း၊ ဓာတ်ပုံစစ်ဆေးခြင်းနှင့် မှတ်တမ်း',
      icon: <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      isBadge: true,
      badgeText: 'AI',
    },
    {
      id: 'remedies',
      labelEn: 'Symptoms & Home Remedies',
      labelMy: 'ရောဂါလက္ခဏာများ',
      shortEn: 'Remedies',
      shortMy: 'ဆေးနည်း',
      descEn: 'Home remedies for runny nose, cough, stomach ache, skin, toothache & headache',
      descMy: 'နှာစီး၊ ချောင်းဆိုး၊ ဗိုက်အောင့်၊ အရေပြား၊ သွားကိုက်၊ ခေါင်းကိုက် သဘာဝ ဆေးနည်းများ',
      icon: <Thermometer className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      isBadge: true,
      badgeText: 'Remedies',
    },
    {
      id: 'home_treatments',
      labelEn: 'Home Acupressure Treatments',
      labelMy: 'အိမ်တွင်း လက်နှိပ်ကုထုံးများ',
      shortEn: 'Treatments',
      shortMy: 'လက်နှိပ်ကုထုံး',
      descEn: '37 Acupressure points guide with anatomical diagrams, table view & timer',
      descMy: 'ရောဂါ ၃၇ မျိုးအတွက် အိမ်တွင်း လက်နှိပ်ကုထုံး ဆုံမှတ်များ၊ ဇယားနှင့် အချိန်မှတ်စက်',
      icon: <ShieldCheck className="w-4 h-4 text-sky-500" />,
      isBadge: true,
      badgeText: '37 Points',
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

  // Only display Admin Panel in navigation if current user is an authorized admin
  const visibleNavItems = navItems.filter((item) => item.id !== 'admin' || isAdmin);

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
      {/* Top Header: Responsive Clean Layout */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-950/95 comfort:bg-[#faf6ee]/95 backdrop-blur-md border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] transition-colors">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Brand Identity (SHOW CARE MYANMAR) - Only Brand on Mobile Left */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => {
                onSelectSection('overview');
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer group min-w-0"
              id="tmhip-logo-btn"
              type="button"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Leaf className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black text-sm xs:text-base sm:text-lg tracking-tight leading-none bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent animate-pulse truncate">
                    SHOW CARE MYANMAR
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 comfort:text-emerald-900 font-bold leading-tight font-myanmar hidden md:block truncate">
                  {language === 'my' ? 'သဘာဝဆေးနှင့် ကျန်းမာရေး လမ်းညွှန်' : 'Health & Home Treatment Guide'}
                </span>
              </div>
            </button>
          </div>

          {/* Right Header Actions: Clean Mobile Menu / Desktop Extended Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Universal Search Spotlight Button */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="h-10 px-3 sm:px-3.5 rounded-full bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white comfort:text-[#231f1a] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] shadow-2xs active:scale-95"
                type="button"
                id="top-global-search-btn"
                title={language === 'my' ? 'တစ်နေရာတည်းမှ ရှာဖွေမည် (⌘K)' : 'Universal Search (⌘K)'}
                aria-label="Universal Search"
              >
                <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-extrabold whitespace-nowrap hidden sm:inline">
                  {language === 'my' ? 'ရှာဖွေရန်' : 'Search'}
                </span>
                <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-400 font-mono">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* AI Doctor Header Shortcut */}
            <button
              onClick={() => {
                onSelectSection('assistant');
                setMenuOpen(false);
              }}
              className={`h-10 px-3 sm:px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                activeSection === 'assistant'
                  ? 'bg-purple-600 text-white border-transparent ring-2 ring-purple-500/30'
                  : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              }`}
              type="button"
              id="top-ai-doctor-btn"
              title={language === 'my' ? 'AI ဆရာဝန်နှင့် တိုင်ပင်ဆွေးနွေးရန်' : 'Consult Clinical AI Doctor'}
            >
              <Bot className="w-4 h-4 text-current" />
              <span className="font-extrabold whitespace-nowrap hidden sm:inline">
                {language === 'my' ? 'AI ဆရာဝန်' : 'AI Doctor'}
              </span>
            </button>

            {/* Menu Bar Button (Menu / မီနူး) - Minimum 44x44px Touch Target on Mobile */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`min-h-[44px] min-w-[44px] h-11 px-3 sm:px-4 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border transition-all text-xs font-bold shadow-2xs active:scale-95 ${
                menuOpen
                  ? 'bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] border-transparent shadow-sm ring-2 ring-emerald-500/30'
                  : 'bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white comfort:text-[#231f1a] border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1]'
              }`}
              aria-label="Open menu drawer with settings, login and navigation"
              id="top-menu-bar-btn"
              type="button"
            >
              {menuOpen ? <X className="w-5 h-5 text-current" /> : <Menu className="w-5 h-5 text-current" />}
              <span className="font-myanmar font-bold whitespace-nowrap hidden sm:inline">
                {language === 'my' ? 'မီနူး' : 'Menu'}
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* Slide-over / Modal Menu Bar: ALL CONTROLS NEATLY ORGANIZED */}
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
                  <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-extrabold text-sm shadow-xs">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-black dark:text-white comfort:text-[#231f1a] tracking-tight font-myanmar">
                      {language === 'my' ? 'မီနူးနှင့် စီမံခန့်ခွဲမှု' : 'Menu & Settings'}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 comfort:text-[#645a4e] font-myanmar">
                      {language === 'my' ? 'အကောင့်၊ ဘာသာစကားနှင့် ကဏ္ဍများ' : 'Account, language & navigation'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full bg-white dark:bg-neutral-800 comfort:bg-[#faf6ee] hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-black dark:text-white comfort:text-[#231f1a] transition-colors border border-border-subtle dark:border-neutral-700 cursor-pointer shadow-2xs active:scale-95"
                  aria-label="Close menu bar"
                  id="close-menu-bar-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

                {/* 1. User Account & Login Hub Card */}
                <div className="p-3.5 rounded-2xl bg-neutral-100/90 dark:bg-neutral-900/90 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-950 dark:text-white comfort:text-[#231f1a] font-myanmar truncate">
                        {language === 'my' ? 'အသုံးပြုသူ အကောင့်' : 'User Account'}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {language === 'my' ? 'ကိုယ်ပိုင်အချက်အလက် / မှတ်တမ်း' : 'Profile & saved medical notes'}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <LoginButton language={language} variant="compact" />
                  </div>
                </div>

                {/* 2. Language Switcher (Prominent Segmented Control in Menu Bar) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 comfort:text-[#8c7e6d] uppercase tracking-wider font-myanmar flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'my' ? 'ဘာသာစကား ရွေးချယ်ရန် (Language)' : 'Language'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
                    <button
                      type="button"
                      onClick={() => { if (language !== 'my') onToggleLanguage(); }}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                        language === 'my'
                          ? 'bg-white dark:bg-neutral-800 comfort:bg-[#faf6ee] text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span className="text-base">🇲🇲</span>
                      <span className="font-myanmar font-extrabold">မြန်မာဘာသာ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (language !== 'en') onToggleLanguage(); }}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                        language === 'en'
                          ? 'bg-white dark:bg-neutral-800 comfort:bg-[#faf6ee] text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span className="text-base">🇺🇸</span>
                      <span className="font-sans font-extrabold">English</span>
                    </button>
                  </div>
                </div>

                {/* 3. Offline Medical Pack Hub */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenOfflinePack?.();
                    setMenuOpen(false);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 border border-teal-500/25 flex items-center justify-between gap-3 shadow-2xs hover:border-teal-500/50 transition cursor-pointer text-left active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <WifiOff className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 font-myanmar">
                      <div className="text-xs font-extrabold text-neutral-950 dark:text-white comfort:text-[#231f1a] truncate">
                        {language === 'my' ? 'အော့ဖ်လိုင်း ဆေးကျမ်းများ (~12MB)' : 'Offline Medical Pack'}
                      </div>
                      <div className="text-[11px] text-teal-800 dark:text-teal-300 truncate">
                        {language === 'my' ? 'အင်တာနက်မရှိဘဲ ဖတ်ရှုရန် ဒေါင်းလုဒ်ဆွဲမည်' : 'Read 120+ herbs & acupoints offline'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-600 shrink-0" />
                </button>

                {/* 4. Mobile PWA App Install Hub */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/25 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 font-myanmar">
                      <div className="text-xs font-extrabold text-neutral-950 dark:text-white comfort:text-[#231f1a] truncate">
                        {isPwaStandalone()
                          ? (language === 'my' ? 'ShowCare App သွင်းပြီးပါပြီ' : 'ShowCare App Installed')
                          : (language === 'my' ? 'Android / iOS App ထည့်မည်' : 'Install Mobile App')}
                      </div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 truncate">
                        {isPwaStandalone()
                          ? (language === 'my' ? 'အော့ဖ်လိုင်းအသုံးပြုနိုင်ပါသည် ✓' : 'Offline ready ✓')
                          : (language === 'my' ? 'ဖုန်းထဲတွင် App သီးသန့်သုံးရန်' : 'Standalone fast access')}
                      </div>
                    </div>
                  </div>
                  {!isPwaStandalone() && (
                    <button
                      type="button"
                      onClick={async () => {
                        const outcome = await promptPwaInstall();
                        if (outcome === 'accepted') {
                          setMenuOpen(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'my' ? 'သွင်းမည်' : 'Install'}</span>
                    </button>
                  )}
                </div>

                {/* 3. Theme & Appearance Switcher (Light / Dark / Comfort with 44px touch targets) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 comfort:text-[#8c7e6d] uppercase tracking-wider font-myanmar flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'my' ? 'နောက်ခံ အရောင်နှင့် အလင်းစနစ်' : 'Theme & Appearance'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
                    <button
                      type="button"
                      onClick={() => onChangeThemeMode('light')}
                      className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                        themeMode === 'light'
                          ? 'bg-white text-emerald-700 shadow-xs border border-emerald-500/30 font-black'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                      title={language === 'my' ? 'အလင်းစနစ်' : 'Light Mode'}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span className="text-[11px] font-myanmar">{language === 'my' ? 'အလင်း' : 'Light'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeThemeMode('dark')}
                      className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                        themeMode === 'dark'
                          ? 'bg-neutral-800 text-emerald-400 shadow-xs border border-emerald-500/30 font-black'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                      title={language === 'my' ? 'အမှောင်စနစ်' : 'Dark Mode'}
                    >
                      <Moon className="w-4 h-4 text-purple-400" />
                      <span className="text-[11px] font-myanmar">{language === 'my' ? 'အမှောင်' : 'Dark'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleComfortToggle}
                      className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                        themeMode === 'comfort'
                          ? 'bg-[#785b3a] text-white shadow-xs border border-[#5d4428] font-black'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                      title={language === 'my' ? 'မျက်စိအေး စာဖတ်စနစ်' : 'Eye-Comfort Paper Mode'}
                    >
                      <Coffee className="w-4 h-4 text-amber-300" />
                      <span className="text-[11px] font-myanmar">{language === 'my' ? 'မျက်စိအေး' : 'Comfort'}</span>
                    </button>
                  </div>
                </div>

                {/* 4. Quick Actions & Emergency 192 Bar */}
                <div className="space-y-3 pt-2 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
                  <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 comfort:text-[#8c7e6d] uppercase tracking-wider font-myanmar">
                    {language === 'my' ? 'အမြန် ထိန်းချုပ်ခလုတ်များ' : 'Quick Actions & Accessibility'}
                  </div>

                  {/* Priority Emergency 192 Button */}
                  <a
                    href="tel:192"
                    id="menu-emergency-192-btn"
                    className="min-h-[44px] w-full p-3 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold flex items-center justify-between shadow-md transition-all cursor-pointer active:scale-95"
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
                          className={`min-h-[44px] py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border active:scale-95 ${
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
                </div>

                {/* 5. All Platform Section Navigation Buttons */}
                <div className="space-y-2 pt-2 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
                  <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 comfort:text-[#8c7e6d] uppercase tracking-wider font-myanmar">
                    {language === 'my' ? 'ကျန်းမာရေး ကဏ္ဍများ' : 'Platform Navigation'}
                  </div>

                  <div className="space-y-1.5">
                    {visibleNavItems.map((item) => {
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

      {/* Persistent Clean Mobile Bottom Navigation Dock (4 Top Daily Sections + More) */}
      <nav 
        className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-950/95 comfort:bg-[#faf6ee]/95 backdrop-blur-xl border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] px-2 py-1 shadow-lg transition-colors"
        aria-label="Mobile Bottom Navigation Dock"
        id="mobile-bottom-menu-bar"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {/* 4 Core Daily Sections */}
          {visibleNavItems.slice(0, 4).map((item) => {
            const isActive = activeSection === item.id && !menuOpen;
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
                  <span className="absolute top-0 w-6 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 comfort:bg-emerald-700"></span>
                )}

                <div className={`p-0.5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {item.icon}
                </div>

                <span className="text-[11px] font-semibold leading-tight text-center font-myanmar whitespace-nowrap mt-0.5">
                  {language === 'my' ? item.shortMy : item.shortEn}
                </span>
              </button>
            );
          })}

          {/* 5th Tab: More (အခြား / မီနူး) for Secondary Catalogs & Admin */}
          {(() => {
            const isSecondarySection = !['overview', 'assistant', 'remedies', 'home_treatments'].includes(activeSection);
            const isMoreActive = menuOpen || isSecondarySection;
            return (
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer relative min-h-[48px] ${
                  isMoreActive
                    ? 'text-black dark:text-white comfort:text-[#231f1a] font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 comfort:text-[#645a4e] hover:text-black dark:hover:text-white'
                }`}
                id="bottom-nav-more"
                type="button"
                title={language === 'my' ? 'နောက်ထပ် ကဏ္ဍများနှင့် မီနူး' : 'More Sections & Menu'}
                aria-label="Open More Menu"
              >
                {isMoreActive && (
                  <span className="absolute top-0 w-6 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 comfort:bg-emerald-700"></span>
                )}

                <div className={`p-0.5 transition-transform ${isMoreActive ? 'scale-110' : 'scale-100'}`}>
                  <Menu className="w-4 h-4 text-neutral-600 dark:text-neutral-300 comfort:text-[#645a4e]" />
                </div>

                <span className="text-[11px] font-semibold leading-tight text-center font-myanmar whitespace-nowrap mt-0.5">
                  {language === 'my' ? 'အခြား' : 'More'}
                </span>
              </button>
            );
          })()}
        </div>
      </nav>
    </>
  );
};
