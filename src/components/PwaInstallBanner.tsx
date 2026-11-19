import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';
import { isPwaStandalone, isPwaInstallable, promptPwaInstall, subscribePwaInstall } from '../lib/pwaHelper';

export interface PwaInstallBannerProps {
  language: 'en' | 'my';
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ language }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    setIsStandalone(isPwaStandalone());

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('showcare_pwa_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

    const unsubscribe = subscribePwaInstall((installable) => {
      setCanInstall(installable);
    });

    return () => unsubscribe();
  }, []);

  // If already running inside installed standalone PWA app, don't show prompt
  if (isStandalone || isDismissed || installSuccess) {
    return null;
  }

  // Only show if browser supports direct install OR on iOS Safari
  if (!canInstall && !isIos) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    const outcome = await promptPwaInstall();
    if (outcome === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        setIsDismissed(true);
      }, 3000);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('showcare_pwa_dismissed', 'true');
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-md relative z-40 animate-in slide-in-from-top duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: App Logo & Myanmar Instructions */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <Smartphone className="w-5 h-5 text-emerald-100 animate-bounce" />
          </div>
          <div className="min-w-0 font-myanmar">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight truncate text-white">
                SHOW CARE MYANMAR App
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/25 font-bold uppercase tracking-wider text-emerald-100 hidden xs:inline">
                Android & iOS
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-tight truncate">
              {language === 'my'
                ? 'ဖုန်းထဲတွင် App ကဲ့သို့ Install လုပ်ပြီး အင်တာနက်မရှိလည်း သုံးနိုင်ပါသည်'
                : 'Install as mobile app for quick access & offline support'}
            </p>
          </div>
        </div>

        {/* Right: Install Action & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>{language === 'my' ? 'App သွင်းမည်' : 'Install App'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* iOS Safari Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white p-5 space-y-4 shadow-2xl border border-neutral-200 dark:border-neutral-800 font-myanmar">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Share className="w-4 h-4 text-emerald-600" />
                <span>iPhone / iPad တွင် App သွင်းနည်း</span>
              </h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="text-xs space-y-2.5 text-neutral-700 dark:text-neutral-300 list-decimal list-inside leading-relaxed">
              <li>Safari Browser ၏ အောက်ခြေရှိ <strong>Share (မျှဝေရန်)</strong> ခလုတ်ကို နှိပ်ပါ။</li>
              <li>ပေါ်လာသော Menu ထဲမှ <strong>"Add to Home Screen" (ပင်မစာမျက်နှာသို့ ထည့်မည်)</strong> ကို ရွေးပါ။</li>
              <li>ညာဘက်အပေါ်ထောင့်ရှိ <strong>"Add"</strong> ကို နှိပ်လိုက်ပါက သင့် iPhone တွင် App အဖြစ် အသုံးပြုနိုင်ပါပြီ။</li>
            </ol>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
            >
              နားလည်ပါပြီ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PwaInstallBanner;
