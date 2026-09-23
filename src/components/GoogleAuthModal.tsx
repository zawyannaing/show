import React, { useState } from 'react';
import { 
  X, 
  LogOut, 
  AlertCircle, 
  ShieldCheck, 
  Loader2, 
  Crown, 
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  CheckCircle2
} from 'lucide-react';
import { useSupabaseUser, signInWithPassword, signUpWithPassword, signInWithGoogle, signOutUser } from '../lib/supabaseAuth';

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'my';
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const { user, userName, userEmail, userAvatar, isAdmin, loading: authLoading } = useSupabaseUser();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(
          language === 'my'
            ? `Google Auth ချိတ်ဆက်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${error}`
            : `Google OAuth Error: ${error}`
        );
      } else {
        setSuccessMessage(
          language === 'my'
            ? 'Google Auth သို့ ပြောင်းလဲချိတ်ဆက်နေပါသည်...'
            : 'Redirecting to Google OAuth...'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google Auth Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage(
        language === 'my' 
          ? 'အီးမေးလ်နှင့် စကားဝှက်ကို ဖြည့်စွက်ပါ' 
          : 'Please enter both email and password.'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        language === 'my' 
          ? 'စကားဝှက်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်' 
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    setSubmitting(true);

    try {
      if (activeTab === 'signin') {
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) {
          setErrorMessage(
            language === 'my' 
              ? `ဝင်ရောက်မှု မအောင်မြင်ပါ: ${error}` 
              : `Sign in failed: ${error}`
          );
        } else {
          setSuccessMessage(
            language === 'my' 
              ? 'အောင်မြင်စွာ ဝင်ရောက်ပြီးပါပြီ' 
              : 'Signed in successfully!'
          );
          setTimeout(() => {
            onClose();
          }, 800);
        }
      } else {
        const { error } = await signUpWithPassword(email.trim(), password, fullName.trim());
        if (error) {
          setErrorMessage(
            language === 'my' 
              ? `အကောင့်သစ် ဖွင့်မရပါ: ${error}` 
              : `Sign up failed: ${error}`
          );
        } else {
          setSuccessMessage(
            language === 'my' 
              ? 'အကောင့်သစ် အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။ (အီးမေးလ် အတည်ပြုရန် လိုအပ်ပါက စစ်ဆေးပေးပါ)' 
              : 'Account created successfully! Please check your email for confirmation if required.'
          );
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const { error } = await signOutUser();
    if (error) {
      setErrorMessage(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] w-full max-w-md rounded-3xl border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs border border-emerald-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-black dark:text-white comfort:text-[#231f1a] font-myanmar">
                {language === 'my' ? 'အကောင့် ဝင်ရောက်ခြင်း / သစ်ဖွင့်ခြင်း' : 'Account Authentication'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-myanmar">
                {language === 'my' 
                  ? 'အီးမေးလ်နှင့် စကားဝှက်ဖြင့် အကောင့်ဝင်ရောက်ပါ' 
                  : 'Sign in with your Email and Password'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {user ? (
            /* Logged-in profile view with Admin vs User role status */
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-start sm:items-center gap-3.5 ${
                isAdmin 
                  ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30' 
                  : 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/20'
              }`}>
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName || 'User'} 
                    className={`w-12 h-12 rounded-full border-2 object-cover shrink-0 ${
                      isAdmin ? 'border-amber-500' : 'border-emerald-500'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg shrink-0 ${
                    isAdmin ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}>
                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-sm sm:text-base text-black dark:text-white comfort:text-[#231f1a] truncate">
                      {userName || 'Authenticated User'}
                    </span>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-400/20 border border-amber-500/30 px-2 py-0.5 rounded-full font-myanmar">
                        <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>{language === 'my' ? 'စနစ်စီမံခန့်ခွဲသူ (Admin)' : 'Administrator'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full font-myanmar">
                        <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{language === 'my' ? 'အသုံးပြုသူ (User Member)' : 'Standard User'}</span>
                      </span>
                    )}
                  </div>
                  
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate block mt-0.5 font-mono">
                    {userEmail}
                  </span>

                  <p className="mt-2 text-xs font-myanmar leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {isAdmin ? (
                      language === 'my' 
                        ? '✅ သင့် အကောင့်သည် Admin အဆင့်ဖြစ်သဖြင့် ပိုစ့်တင်ခြင်း၊ ဆေးကျမ်းများနှင့် ကဏ္ဍများ စီမံခွင့် ရရှိထားပါသည်။'
                        : '✅ Admin privileges verified: Full access to create/edit posts, herbal monographs, and directories.'
                    ) : (
                      language === 'my'
                        ? 'ℹ️ သင့် အကောင့်သည် ပုံမှန်အသုံးပြုသူအဆင့်ဖြစ်ပါသည်။ ပိုစ့်တင်ရန် Admin Mail ဖြင့် ဝင်ရောက်ရန် လိုအပ်ပါသည်။'
                        : 'ℹ️ Standard user profile active. To access clinical posting controls, sign in with an authorized Admin email.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-2xl bg-neutral-100 hover:bg-red-50 hover:text-red-600 dark:bg-neutral-800 dark:hover:bg-red-950/40 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-neutral-200 dark:border-neutral-700 font-myanmar"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === 'my' ? 'အကောင့်ထွက်မည် (Sign Out)' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login & Sign Up view */
            <div className="space-y-4">
              {/* Primary Google Login Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting || authLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer font-myanmar disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{language === 'my' ? 'Google အကောင့်ဖြင့် ဝင်ရောက်မည်' : 'Continue with Google'}</span>
              </button>

              {/* Default Admin Quick Credentials Card */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 space-y-1.5 font-myanmar">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{language === 'my' ? 'Default Admin အကောင့်ဖြင့် ဝင်ရောက်ရန်:' : 'Default Admin Login:'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin');
                      setPassword('admin#$234');
                      setActiveTab('signin');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition cursor-pointer shadow-xs"
                  >
                    {language === 'my' ? 'အလိုအလျောက် ဖြည့်မည် (Auto Fill)' : 'Auto Fill'}
                  </button>
                </div>
                <div className="text-[11px] text-amber-900 dark:text-amber-300 font-mono leading-tight">
                  Username: <span className="font-bold underline">admin</span> | Password: <span className="font-bold underline">admin#$234</span>
                </div>
              </div>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-neutral-200 dark:border-neutral-800 w-full"></div>
                <span className="bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-myanmar absolute">
                  {language === 'my' ? 'သို့မဟုတ် အီးမေးလ်ဖြင့်' : 'OR EMAIL'}
                </span>
              </div>

              {/* Tab Selector */}
              <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-myanmar ${
                    activeTab === 'signin'
                      ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'ဝင်ရောက်ရန်' : 'Sign In'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 font-myanmar ${
                    activeTab === 'signup'
                      ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'အကောင့်သစ်ဖွင့်ရန်' : 'Sign Up'}</span>
                </button>
              </div>

              {/* Notification Alerts */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 font-myanmar leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold">{errorMessage}</div>
                    {(errorMessage.toLowerCase().includes('api key') || errorMessage.includes('401') || errorMessage.includes('invalid')) && (
                      <div className="text-[11px] text-red-800 dark:text-red-200 mt-1 font-myanmar bg-red-100 dark:bg-red-900/40 p-2 rounded-xl border border-red-300 dark:border-red-800">
                        {language === 'my' 
                          ? '💡 .env ဖိုင်ရှိ VITE_SUPABASE_ANON_KEY တွင် သင့် Supabase Dashboard > Project Settings > API မှ ရယူထားသော JWT Anon Key (eyJhbGci...) အမှန်ကို ထည့်သွင်းပေးပါရန်။' 
                          : '💡 Please update VITE_SUPABASE_ANON_KEY in .env with your valid JWT anon key (eyJhbGci...) from Supabase Dashboard > Project Settings > API.'}
                      </div>
                    )}
                    {(errorMessage.toLowerCase().includes('not enabled') || errorMessage.toLowerCase().includes('provider') || errorMessage.toLowerCase().includes('oauth')) && (
                      <div className="text-[11px] text-red-800 dark:text-red-200 mt-1 font-myanmar bg-red-100 dark:bg-red-900/40 p-2 rounded-xl border border-red-300 dark:border-red-800">
                        {language === 'my'
                          ? '💡 Supabase Dashboard > Authentication > Providers > Google တွင် Google Provider ကို ဖွင့်ပြီး Client ID & Client Secret ထည့်ပေးရန် လိုအပ်ပါသည်။'
                          : '💡 Enable Google Provider in Supabase Dashboard > Authentication > Providers > Google with your Client ID & Client Secret.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 font-myanmar leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div className="flex-1">{successMessage}</div>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {activeTab === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 font-myanmar">
                      {language === 'my' ? 'အမည် (Full Name):' : 'Full Name:'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={language === 'my' ? 'ဥပမာ - မောင်မောင်' : 'e.g. John Doe'}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition font-myanmar"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 font-myanmar">
                    {language === 'my' ? 'အီးမေးလ် (Email):' : 'Email Address:'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 font-myanmar">
                    {language === 'my' ? 'စကားဝှက် (Password):' : 'Password:'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || authLoading}
                  className="w-full mt-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50 font-myanmar"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'my' ? 'ဆောင်ရွက်နေပါသည်...' : 'Processing...'}</span>
                    </>
                  ) : activeTab === 'signin' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{language === 'my' ? 'အကောင့်ဝင်မည်' : 'Sign In'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{language === 'my' ? 'အကောင့်သစ်ဖန်တီးမည်' : 'Create Account'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 comfort:bg-[#f2e9d8]/50 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5 font-myanmar">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{language === 'my' ? 'လုံခြုံသော Supabase Auth စနစ်' : 'Secure Supabase Auth'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer font-myanmar"
          >
            {language === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
