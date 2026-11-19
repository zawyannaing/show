import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle2, 
  Trash2, 
  X, 
  WifiOff, 
  Leaf, 
  Activity, 
  Sparkles, 
  ShieldAlert, 
  PhoneCall,
  Loader2,
  HardDrive
} from 'lucide-react';
import { 
  getOfflinePackStatus, 
  downloadOfflineMedicalPack, 
  clearOfflineMedicalPack, 
  OfflinePackStatus 
} from '../lib/offlinePackManager';

export interface OfflinePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'my';
}

export const OfflinePackModal: React.FC<OfflinePackModalProps> = ({ isOpen, onClose, language }) => {
  const [status, setStatus] = useState<OfflinePackStatus>(getOfflinePackStatus);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    setStatus(getOfflinePackStatus());

    const handleUpdate = (e: any) => {
      setStatus(e.detail || getOfflinePackStatus());
    };
    window.addEventListener('showcare_offline_pack_updated', handleUpdate);
    return () => window.removeEventListener('showcare_offline_pack_updated', handleUpdate);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    setDownloading(true);
    setProgress(5);
    setProgressText(language === 'my' ? 'ပြင်ဆင်နေပါသည်...' : 'Initializing offline pack...');

    const success = await downloadOfflineMedicalPack((percent, msg) => {
      setProgress(percent);
      setProgressText(msg);
    });

    if (success) {
      setStatus(getOfflinePackStatus());
    }
    setDownloading(false);
  };

  const handleClear = async () => {
    if (!window.confirm(language === 'my' ? 'အော့ဖ်လိုင်း ဆေးကျမ်းများကို ဖျက်ရန် သေချာပါသလား?' : 'Remove downloaded offline pack?')) return;
    await clearOfflineMedicalPack();
    setStatus(getOfflinePackStatus());
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded4c1] overflow-hidden flex flex-col font-myanmar animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight leading-tight">
                {language === 'my' ? 'အော့ဖ်လိုင်း ဆေးကျမ်း ဒေါင်းလုဒ်ဆွဲရန်' : 'Offline Medical Pack'}
              </h3>
              <p className="text-[11px] text-emerald-100 font-sans">
                {language === 'my' ? 'အင်တာနက်မရှိဘဲ ဖတ်ရှုနိုင်သော စနစ်' : 'Zero-data offline healthcare access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5">
          
          {/* Status Box */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            status.isDownloaded
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-300'
              : 'bg-neutral-100 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                status.isDownloaded ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
              }`}>
                {status.isDownloaded ? <CheckCircle2 className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs sm:text-sm">
                  {status.isDownloaded
                    ? (language === 'my' ? 'အော့ဖ်လိုင်း ဆေးကျမ်းများ အသင့်ရှိပါသည် ✓' : 'Offline Pack Installed ✓')
                    : (language === 'my' ? 'အော့ဖ်လိုင်း မဒေါင်းလုဒ်ရသေးပါ' : 'Offline Pack Not Downloaded')}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {status.isDownloaded
                    ? (language === 'my' ? `ပမာဏ: ${status.sizeEstimate} • အကြောင်းအရာ ${status.totalItems} မျိုး` : `Size: ${status.sizeEstimate} • ${status.totalItems} items ready`)
                    : (language === 'my' ? 'အင်တာနက်မရှိဘဲ အသုံးပြုရန် ဒေါင်းလုဒ်ဆွဲထားပါ' : 'Download once to access medical data offline')}
                </div>
              </div>
            </div>

            {status.isDownloaded && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                title="Remove pack"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Included Features Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              {language === 'my' ? 'ပါဝင်မည့် ဆေးကျမ်းအချက်အလက်များ:' : 'Pack Includes:'}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">{language === 'my' ? 'ဆေးပင် ၁၂၀+ အပြည့်အစုံ' : '120+ Herbs'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="truncate">{language === 'my' ? 'လက်နှိပ်ကုထုံး ၃၇ ချက်' : '37 Acupoints'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">{language === 'my' ? 'အိမ်တွင်း သဘာဝဆေးနည်းများ' : 'Home Remedies'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span className="truncate">{language === 'my' ? 'အရေးပေါ် ရှေးဦးပြုစုနည်းများ' : 'First Aid Protocols'}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar when Downloading */}
          {downloading && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressText}</span>
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={downloading}
            onClick={handleStartDownload}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === 'my' ? 'ဒေါင်းလုဒ်ရယူနေပါသည်...' : 'Downloading Pack...'}</span>
              </>
            ) : status.isDownloaded ? (
              <>
                <Download className="w-4 h-4" />
                <span>{language === 'my' ? 'အချက်အလက်များ အသစ်ပြန်လည် Update လုပ်မည်' : 'Re-download / Update Pack'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{language === 'my' ? '📦 အော့ဖ်လိုင်း ဆေးကျမ်းများ ဒေါင်းလုဒ်ဆွဲမည် (~12 MB)' : 'Download Offline Medical Pack (~12 MB)'}</span>
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
};

export default OfflinePackModal;
