import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MedicinalPlants } from './components/MedicinalPlants';
import { SymptomsFirstAid } from './components/SymptomsFirstAid';
import { EmergencyHotlines } from './components/EmergencyHotlines';
import { AssistantSection } from './components/AssistantSection';

import { SymptomsRemedies } from './components/SymptomsRemedies';
import { Footer } from './components/Footer';
import { HerbMonographModal } from './components/HerbMonographModal';
import { HerbCatalogModal } from './components/HerbCatalogModal';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { DynamicPostsFeed } from './components/DynamicPostsFeed';
import { AdminPostUpload } from './components/AdminPostUpload';
import { HERBS_DATA } from './data/herbs';
import { PROTOCOLS_DATA } from './data/protocols';
import { DEFAULT_CONSULTATION_HISTORY } from './data/consultationHistory';
import { 
  getManagedHerbs, 
  getManagedProtocols, 
  getManagedHotlines, 
  getManagedSeniorTopics 
} from './lib/contentManager';
import { Herb, EmergencyProtocol, ActiveSection, ThemeMode, FontSize } from './types';

export default function App() {
  // Theme state: 'light' | 'comfort' | 'dark' with localStorage persistence
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tmhip_theme_mode') as ThemeMode;
      if (saved && ['light', 'comfort', 'dark'].includes(saved)) return saved;
      const oldDark = localStorage.getItem('tmhip_theme');
      if (oldDark === 'dark') return 'dark';
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  // Font size state: 'sm' | 'base' | 'lg' | 'xl' with localStorage persistence
  // Default to 'lg' (18px) for 40+ demographic if not set
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tmhip_font_size') as FontSize;
      if (saved && ['sm', 'base', 'lg', 'xl'].includes(saved)) return saved;
    }
    return 'base';
  });

  // Language state (Defaults to Myanmar, persists user preference)
  const [language, setLanguage] = useState<'en' | 'my'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tmhip_user_language') as 'en' | 'my' | null;
      if (saved === 'en' || saved === 'my') return saved;
    }
    return 'my';
  });

  // Active Section State (Switch Section Style navigation)
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');

  // Admin section subtab selection for direct navigation
  const [adminInitialTab, setAdminInitialTab] = useState<'post' | 'sections'>('post');
  const [adminSectionSubTab, setAdminSectionSubTab] = useState<'plants' | 'symptoms' | 'firstaid' | 'hotlines'>('plants');
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | undefined>(undefined);

  // Dynamic managed datasets
  const [currentHerbs, setCurrentHerbs] = useState<Herb[]>(() => getManagedHerbs());
  const [currentProtocols, setCurrentProtocols] = useState<EmergencyProtocol[]>(() => getManagedProtocols());

  // Listen for real-time section content updates across the entire app
  useEffect(() => {
    const handleContentUpdate = () => {
      setCurrentHerbs(getManagedHerbs());
      setCurrentProtocols(getManagedProtocols());
    };
    window.addEventListener('tmhip_content_updated', handleContentUpdate);
    return () => window.removeEventListener('tmhip_content_updated', handleContentUpdate);
  }, []);

  // Modals and detail states
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  const [herbFilterText, setHerbFilterText] = useState('');

  // Sync theme mode on root element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'comfort');
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'comfort') {
      root.classList.add('comfort');
    }
    localStorage.setItem('tmhip_theme_mode', themeMode);
  }, [themeMode]);

  // Sync font size scaling attribute on root element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('tmhip_font_size', fontSize);
  }, [fontSize]);

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const nextLang = prev === 'en' ? 'my' : 'en';
      if (typeof window !== 'undefined') {
        localStorage.setItem('tmhip_user_language', nextLang);
      }
      return nextLang;
    });
  };

  const handleSelectSection = (section: ActiveSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string, discipline: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    // Check if query targets 40+ senior health conditions
    if (
      q.includes('pressure') || 
      q.includes('bp') || 
      q.includes('diabetes') || 
      q.includes('sugar') || 
      q.includes('joint') || 
      q.includes('knee') || 
      q.includes('arthritis') || 
      q.includes('sleep') || 
      q.includes('သွေးတိုး') || 
      q.includes('ဆီးချို') || 
      q.includes('ဒူးနာ') || 
      q.includes('အဆစ်') || 
      q.includes('အိပ်မပျော်')
    ) {
      setActiveSection('symptoms');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (
      q.includes('burn') || 
      q.includes('snake') || 
      q.includes('fever') || 
      q.includes('stroke') || 
      q.includes('cardiac') ||
      q.includes('မီးလောင်') || 
      q.includes('မြွေ') || 
      q.includes('လေဖြတ်') ||
      discipline === 'firstaid' || 
      discipline === 'symptoms'
    ) {
      setActiveSection('symptoms');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Herb search
      const matched = currentHerbs.find(
        (h) =>
          h.scientificName.toLowerCase().includes(q) ||
          h.englishName.toLowerCase().includes(q) ||
          h.myanmarName.includes(q) ||
          h.tags.some(t => t.toLowerCase().includes(q))
      );

      if (matched) {
        setSelectedHerb(matched);
      } else {
        setHerbFilterText(query);
        setActiveSection('plants');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSelectProtocol = (protocol: EmergencyProtocol) => {
    setActiveSection('symptoms');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectHerbByName = (herbName: string) => {
    const clean = herbName.toLowerCase().trim();
    const matched = currentHerbs.find(
      (h) =>
        h.englishName.toLowerCase().includes(clean) ||
        h.myanmarName.includes(clean) ||
        h.scientificName.toLowerCase().includes(clean)
    );
    if (matched) {
      setSelectedHerb(matched);
    } else {
      setHerbFilterText(herbName);
      setActiveSection('plants');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleConsultAssistant = (prompt?: string) => {
    setAssistantInitialPrompt(prompt);
    setActiveSection('assistant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick navigation directly to specific admin section
  const handleOpenAdminSection = (section: 'plants' | 'symptoms' | 'firstaid' | 'hotlines') => {
    setAdminInitialTab('sections');
    setAdminSectionSubTab(section);
    setActiveSection('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] antialiased selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors flex flex-col justify-between">
      {/* Top Header Navbar with Switch Section Tabs & Accessibility Controls (A- to A++, Theme, Lang) */}
      <Navbar
        themeMode={themeMode}
        onChangeThemeMode={setThemeMode}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onOpenChat={() => handleConsultAssistant()}
      />

      {/* Main Content Area: Renders according to active section (Switch Section Style) */}
      <main className="w-full flex-1 pb-24 xl:pb-0">
        {/* VIEW 1: Home Section - Only Community Bulletins & Posts (Live Post and Daily Post) */}
        {(activeSection === 'overview' || activeSection === 'posts') && (
          <div className="animate-in fade-in duration-200">
            <DynamicPostsFeed 
              language={language} 
              onNavigateAdmin={() => handleSelectSection('admin')} 
            />
          </div>
        )}



        {/* VIEW 3: Symptoms & Home Remedies (ရောဂါလက္ခဏာများ နှင့် အိမ်တွင်းဆေးနည်းများ) */}
        {activeSection === 'remedies' && (
          <div className="animate-in fade-in duration-200">
            <SymptomsRemedies
              language={language}
              onConsultAdvisor={(prompt: string) => {
                handleConsultAssistant(prompt);
              }}
            />
          </div>
        )}

        {/* VIEW 3: Medicinal Plants Directory */}
        {activeSection === 'plants' && (
          <div className="animate-in fade-in duration-200">
            <MedicinalPlants
              herbs={currentHerbs}
              onSelectHerb={(herb) => setSelectedHerb(herb)}
              onOpenCatalog={() => setIsCatalogOpen(true)}
              language={language}
              filterText={herbFilterText}
              onManageSection={() => handleOpenAdminSection('plants')}
            />
          </div>
        )}

        {/* VIEW 4: Symptoms & Standardized First Aid */}
        {activeSection === 'symptoms' && (
          <div className="animate-in fade-in duration-200">
            <SymptomsFirstAid
              protocols={currentProtocols}
              language={language}
              onSelectProtocol={handleSelectProtocol}
              onManageSection={() => handleOpenAdminSection('firstaid')}
            />
          </div>
        )}

        {/* VIEW 5: Emergency Hotlines & Dispatch */}
        {activeSection === 'hotlines' && (
          <div className="animate-in fade-in duration-200">
            <EmergencyHotlines 
              language={language} 
              onManageSection={() => handleOpenAdminSection('hotlines')}
            />
          </div>
        )}

        {/* VIEW 6: Doctor AI (Gemini Chat & Medicine Vision) */}
        {activeSection === 'assistant' && (
          <div className="animate-in fade-in duration-200">
            <AssistantSection 
              language={language} 
              initialPrompt={assistantInitialPrompt} 
              history={DEFAULT_CONSULTATION_HISTORY}
            />
          </div>
        )}

        {/* VIEW 7: Admin Post Upload (Supabase Storage & Table Insert) */}
        {activeSection === 'admin' && (
          <div className="animate-in fade-in duration-200">
            <AdminPostUpload 
              language={language} 
              onNavigateHome={() => handleSelectSection('overview')}
              initialTab={adminInitialTab}
              initialSectionTab={adminSectionSubTab}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer language={language} />

      {/* Floating AI Clinical Assistant (visible on other sections for quick consults) */}
      {activeSection !== 'assistant' && (
        <AiAssistantWidget
          isOpen={isChatWidgetOpen}
          onToggle={() => setIsChatWidgetOpen((prev) => !prev)}
          language={language}
          onOpenFullAssistant={handleConsultAssistant}
        />
      )}

      {/* Herb Monograph Detail Modal */}
      <HerbMonographModal
        herb={selectedHerb}
        onClose={() => setSelectedHerb(null)}
        language={language}
      />

      {/* 120+ Herbs Catalog Directory Modal */}
      <HerbCatalogModal
        herbs={currentHerbs}
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectHerb={(herb) => {
          setIsCatalogOpen(false);
          setSelectedHerb(herb);
        }}
        language={language}
      />
    </div>
  );
}
