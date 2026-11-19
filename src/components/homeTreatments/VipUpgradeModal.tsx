import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Gift, 
  ArrowRight,
  Zap
} from 'lucide-react';

interface VipUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVip: boolean;
  onActivateVip: () => void;
}

export const VipUpgradeModal: React.FC<VipUpgradeModalProps> = ({
  isOpen,
  onClose,
  isVip,
  onActivateVip
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [referralCode, setReferralCode] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<'kpay' | 'wave' | 'ayapay'>('kpay');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleSimulatePayment = () => {
    onActivateVip();
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white dark:bg-[#111827] comfort:bg-[#fbf7ed] rounded-3xl shadow-2xl overflow-hidden border border-amber-500/30 flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className="relative p-6 bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-yellow-200 fill-yellow-200/50" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black tracking-wide">
                      VIP ကျန်းမာရေး အဖွဲ့ဝင်
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 border border-white/30">
                      PREMIUM
                    </span>
                  </div>
                  <p className="text-xs text-amber-100 mt-0.5">
                    တိုင်းရင်းဆေးနှင့် အကြောကုထုံး အထူးသီးသန့် ဝန်ဆောင်မှုများ
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Cycle Toggle */}
            <div className="flex items-center justify-center">
              <div className="p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#ece2d0] flex items-center text-xs font-bold">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`py-1.5 px-4 rounded-xl transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  ၁ လစာ (Monthly)
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`py-1.5 px-4 rounded-xl flex items-center gap-1.5 transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <span>၁ နှစ်စာ (Annual)</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-red-600 text-white font-extrabold">
                    -၃၅%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Card Display */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 comfort:bg-[#f6eedd] border-2 border-amber-500/40 text-center">
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {billingCycle === 'yearly' ? '၁ နှစ်စာ ပက်ကေ့ဂျ် (Best Value)' : '၁ လစာ ပက်ကေ့ဂျ်'}
              </div>
              <div className="my-2 flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-black text-amber-900 dark:text-amber-200">
                  {billingCycle === 'yearly' ? '၃၉,၀၀၀' : '၄,၉၀၀'}
                </span>
                <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  ကျပ် / {billingCycle === 'yearly' ? 'တစ်နှစ်' : 'တစ်လ'}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                {billingCycle === 'yearly'
                  ? 'တစ်ရက်လျှင် ၁၀၀ ကျပ်ကျော်သာ ကျသင့်ပြီး အကန့်အသတ်မဲ့ သုံးနိုင်ပါသည်'
                  : 'မည်သည့်အချိန်မဆို ပယ်ဖျက်နိုင်ပါသည်'}
              </p>
            </div>

            {/* VIP Features Checklist */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                VIP အဖွဲ့ဝင် ရရှိမည့် အထူးအခွင့်အရေးများ-
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Gemini AI ကျန်းမာရေး အကြံပေးကို အကန့်အသတ်မဲ့ မေးမြန်းခွင့်</span>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>အကြောနှိပ် ဗီဒီယို/အသံဖိုင်နှင့် သဘာဝ တေးဂီတအားလုံး</span>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>အင်တာနက်မရှိချိန် (Offline Mode) သုံးစွဲခွင့် အပြည့်အစုံ</span>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>တိုင်းရင်းဆေးတိုက်များမှ ဆေးဝါးဝယ်ယူရာတွင် ၁၅% Discount</span>
                </div>
              </div>
            </div>

            {/* Local Payment Methods */}
            <div>
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                ငွေပေးချေမည့် ဒေသတွင်း ပိုက်ဆံအိတ် ရွေးချယ်ပါ-
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedPayment('kpay')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1 ${
                    selectedPayment === 'kpay'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">
                    K
                  </span>
                  <span>KBZPay</span>
                </button>

                <button
                  onClick={() => setSelectedPayment('wave')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1 ${
                    selectedPayment === 'wave'
                      ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-yellow-400 text-neutral-900 flex items-center justify-center font-black text-[10px]">
                    W
                  </span>
                  <span>WavePay</span>
                </button>

                <button
                  onClick={() => setSelectedPayment('ayapay')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1 ${
                    selectedPayment === 'ayapay'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-[10px]">
                    A
                  </span>
                  <span>AYA Pay</span>
                </button>
              </div>
            </div>

            {/* Referral Banner */}
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-300/40 flex items-center gap-3">
              <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <div className="flex-1 text-[11px] text-purple-900 dark:text-purple-200">
                <span className="font-bold">သူငယ်ချင်း ဖိတ်ခေါ်ခွင့်:</span> သူငယ်ချင်း ၃ ဦးကို ဖိတ်ခေါ်ပါက VIP ၁ လ အခမဲ့ လက်ဆောင်ရရှိပါမည်။
              </div>
            </div>

            {/* Upgrade Action Button */}
            <button
              onClick={handleSimulatePayment}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-sm shadow-xl shadow-amber-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {successMsg ? (
                <>
                  <Check className="w-5 h-5 text-white animate-bounce" />
                  <span>VIP အောင်မြင်စွာ အသက်သွင်းပြီးပါပြီ!</span>
                </>
              ) : isVip ? (
                <>
                  <Crown className="w-5 h-5 text-yellow-200" />
                  <span>VIP စနစ် အသုံးပြုနေပါသည်</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span>{selectedPayment.toUpperCase()} ဖြင့် VIP ရယူမည်</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
