import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  QrCode,
  Heart,
  Target
} from 'lucide-react';
import { Treatment } from './data';

interface SocialCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatment: Treatment | null;
}

export const SocialCardModal: React.FC<SocialCardModalProps> = ({
  isOpen,
  onClose,
  treatment
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !treatment) return null;

  const handleCopyText = () => {
    const shareText = `🌿 [မြန်မာ့တိုင်းရင်းဆေးနှင့် အကြောနှိပ်ကုထုံး] 🌿\n\n📌 ဝေဒနာ: ${treatment.title}\n📍 အကြောဆုံမှတ်: ${treatment.pointName}\n📍 တည်နေရာ: ${treatment.location}\n✨ နှိပ်နယ်နည်း: ${treatment.instructions}\n✨ သက်သာစေနိုင်မှု: ${treatment.benefits}\n\n👉 ပိုမိုပြည့်စုံသော တိုင်းရင်းဆေးကုထုံးများကို ဆေးပညာ App တွင် လေ့လာနိုင်ပါသည်။`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCard = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      handleCopyText();
      alert('Card ၏ အချက်အလက်များကို Clipboard သို့ ကူးယူပြီးပါပြီ။ Facebook / Viber တွင် ချက်ချင်း Paste ပြုလုပ်ပြီး မျှဝေနိုင်ပါပြီ!');
    }, 600);
  };

  const benefitsList = treatment.benefits
    ? treatment.benefits.split('၊').map(b => b.trim()).filter(Boolean)
    : [treatment.benefits];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#111827] comfort:bg-[#fcf9f2] rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 comfort:border-[#e8e0d0] bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <Share2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Social Media Card (မျှဝေရန် ပုံစံ)</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body / Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* The Visual Social Card */}
            <div
              ref={cardRef}
              className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl border-2 border-emerald-400/40 overflow-hidden"
            >
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-500/15 rounded-full blur-xl pointer-events-none" />

              {/* Card Top Brand & Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-white/15 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold tracking-wider text-emerald-300 uppercase">
                      မြန်မာ့တိုင်းရင်းဆေးနှင့် အကြောကုထုံး
                    </h4>
                    <p className="text-[10px] text-neutral-300">Traditional Acupressure Guide</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                  {treatment.bodyPart.toUpperCase()}
                </span>
              </div>

              {/* Point Name and Title */}
              <div className="my-5 relative z-10">
                <h3 className="text-2xl font-extrabold text-white tracking-wide">
                  {treatment.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-emerald-300">
                  <Target className="w-4 h-4" />
                  <span>{treatment.pointName}</span>
                </div>
              </div>

              {/* Location Box */}
              <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 mb-4 text-xs space-y-1 relative z-10">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <span>📍 တည်နေရာနှင့် ရှာဖွေနည်း</span>
                </div>
                <p className="text-neutral-200 leading-relaxed">
                  {treatment.location}
                </p>
                {treatment.howToFind && (
                  <p className="text-neutral-300 text-[11px] pt-1 border-t border-white/10">
                    ရှာဖွေပုံ: {treatment.howToFind}
                  </p>
                )}
              </div>

              {/* Key Benefits */}
              <div className="mb-4 relative z-10">
                <div className="text-xs font-semibold text-emerald-300 mb-2 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
                  <span>သက်သာစေနိုင်သော ရောဂါဝေဒနာများ</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {benefitsList.map((benefit, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 text-xs rounded-lg bg-emerald-600/40 border border-emerald-400/30 text-white font-medium"
                    >
                      ✓ {benefit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Safety & App QR Tag */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-neutral-300 relative z-10">
                <div className="flex items-center gap-1.5 text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>တိုင်းရင်းဆေးပညာရှင်များ စစ်ဆေးပြီး</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-300">
                  <QrCode className="w-3.5 h-3.5 text-emerald-300" />
                  <span>HealthApp Myanmar</span>
                </div>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCopyText}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 comfort:border-[#dfd7c5] font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">ကူးယူပြီးပါပြီ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                    <span>စာသား ကူးယူမည်</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadCard}
                disabled={downloading}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'လုပ်ဆောင်နေသည်...' : 'Viber/FB မျှဝေမည်'}</span>
              </button>
            </div>
            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
              * လူမှုကွန်ရက်ပေါ်တွင် ကျန်းမာရေးဗဟုသုတအဖြစ် လွတ်လပ်စွာ မျှဝေနိုင်ပါသည်။
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
