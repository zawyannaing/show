import React, { useState } from 'react';
import { 
  LogOut, 
  Crown, 
  User, 
  AlertCircle, 
  Loader2, 
  ChevronDown,
  Check,
  LogIn,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { GoogleAuthModal } from './GoogleAuthModal';

export interface LoginButtonProps {
  language?: 'en' | 'my';
  className?: string;
  variant?: 'default' | 'compact' | 'header' | 'pill';
  showAdminBadge?: boolean;
  onAdminStatusChange?: (isAdmin: boolean) => void;
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  language = 'en',
  className = '',
  variant = 'default',
  showAdminBadge = true,
}) => {
  const {
    user,
    userEmail,
    userName,
    userAvatar,
    isAdmin,
    loading,
    signOut,
  } = useAuth();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleOpenAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setDropdownOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div
        className={`h-10 px-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center gap-2 text-xs font-semibold ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="font-myanmar">{language === 'my' ? 'စစ်ဆေးနေပါသည်...' : 'Checking...'}</span>
      </div>
    );
  }

  // 2. Unauthenticated State (Render Sign In Button to open modal)
  if (!user) {
    let buttonContent;

    if (variant === 'compact') {
      buttonContent = (
        <button
          type="button"
          onClick={handleOpenAuthModal}
          className={`h-9 px-3 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-border-subtle dark:border-neutral-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs font-myanmar ${className}`}
          title={language === 'my' ? 'အကောင့်ဝင်ရောက်ရန်' : 'Sign in to account'}
          id="auth-login-btn-compact"
        >
          <LogIn className="w-3.5 h-3.5 text-emerald-600" />
          <span>{language === 'my' ? 'ဝင်ရောက်ရန်' : 'Login'}</span>
        </button>
      );
    } else if (variant === 'pill') {
      buttonContent = (
        <button
          type="button"
          onClick={handleOpenAuthModal}
          className={`h-8 px-3 rounded-full bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs font-myanmar ${className}`}
          id="auth-login-btn-pill"
        >
          <KeyRound className="w-3 h-3 text-emerald-600" />
          <span>{language === 'my' ? 'ဝင်ရောက်ရန်' : 'Sign in'}</span>
        </button>
      );
    } else {
      // Default Full Variant
      buttonContent = (
        <button
          type="button"
          onClick={handleOpenAuthModal}
          className={`h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-bold flex items-center gap-2.5 transition cursor-pointer shadow-2xs hover:shadow-xs font-myanmar ${className}`}
          title={language === 'my' ? 'အကောင့်သို့ ဝင်ရောက်ရန်' : 'Sign in with Email and Password'}
          id="auth-login-btn"
        >
          <LogIn className="w-4 h-4" />
          <span className="whitespace-nowrap">
            {language === 'my' ? 'အကောင့်ဝင်ရန်' : 'Sign In'}
          </span>
        </button>
      );
    }

    return (
      <>
        {buttonContent}
        <GoogleAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          language={language}
        />
      </>
    );
  }

  // 3. Authenticated State (Render User Profile + Admin Badge + Sign Out)
  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* User Info Capsule */}
      <div
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition shadow-2xs select-none"
        title={
          isAdmin
            ? (language === 'my' ? 'အက်ဒမင် (Admin) အဖြစ် စစ်ဆေးအတည်ပြုထားပါသည်' : 'Verified Administrator')
            : (language === 'my' ? 'သာမန်အသုံးပြုသူ (User)' : 'Standard User Account')
        }
        id="user-profile-capsule"
      >
        {/* User Avatar */}
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName || 'User'}
            className="w-6 h-6 rounded-full object-cover border border-emerald-500/40 shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
            {(userName || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name & Role Text */}
        <div className="text-left hidden sm:block max-w-[150px]">
          <div className="text-xs font-bold text-black dark:text-white comfort:text-[#231f1a] flex items-center gap-1.5 leading-tight truncate">
            <span className="truncate">{userName || 'User'}</span>

            {/* Conditionally Render Admin Badge based on VITE_ADMIN_EMAILS check */}
            {showAdminBadge && (
              isAdmin ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0 font-myanmar">
                  <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 shrink-0 font-myanmar">
                  <User className="w-2.5 h-2.5 text-emerald-600" />
                  User
                </span>
              )
            )}
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Quick Sign Out Button */}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="h-10 px-2.5 sm:px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 font-myanmar"
        title={language === 'my' ? 'အကောင့်မှ ထွက်မည်' : 'Sign out'}
        id="auth-logout-btn"
      >
        {isSigningOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
        <span className="hidden md:inline">{language === 'my' ? 'ထွက်မည်' : 'Log Out'}</span>
      </button>

      {/* User Details Dropdown Menu */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-12 z-50 w-72 p-4 rounded-2xl bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName || 'User'}
                  className="w-10 h-10 rounded-full object-cover border border-emerald-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-black dark:text-white comfort:text-[#231f1a] truncate">
                  {userName || 'User'}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
                  {userEmail}
                </div>
              </div>
            </div>

            {/* Admin Verification Result */}
            <div className="my-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 font-myanmar">
                  {language === 'my' ? 'အဆင့်အတန်း:' : 'Role Status:'}
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                    <Crown className="w-3 h-3 text-amber-500" />
                    {language === 'my' ? 'အက်ဒမင် (Admin)' : 'Authorized Admin'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <User className="w-3 h-3 text-emerald-500" />
                    {language === 'my' ? 'သာမန်အသုံးပြုသူ' : 'Standard User'}
                  </span>
                )}
              </div>

              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1.5 font-myanmar leading-relaxed">
                {isAdmin ? (
                  <div className="flex items-start gap-1 text-emerald-700 dark:text-emerald-400">
                    <Check className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      {language === 'my'
                        ? 'VITE_ADMIN_EMAILS စာရင်းတွင် ပါဝင်သဖြင့် ပို့စ်တင်ခွင့်/ပြင်ဆင်ခွင့် အပြည့်အစုံ ရရှိထားပါသည်။'
                        : 'Verified in VITE_ADMIN_EMAILS. You have full upload and editing privileges.'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-1 text-neutral-600 dark:text-neutral-400">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      {language === 'my'
                        ? 'ဤအကောင့်သည် VITE_ADMIN_EMAILS တွင် မပါဝင်ပါ။ Admin ခွင့်ပြုချက်အတွက် wayh1360@gmail.com ဖြင့် ဝင်ရောက်ပါ။'
                        : 'This account is not in VITE_ADMIN_EMAILS. Admin buttons are hidden.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Out Action inside Dropdown */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer font-myanmar"
            >
              {isSigningOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span>{language === 'my' ? 'အကောင့်မှ ထွက်ခွာမည်' : 'Sign Out of Account'}</span>
            </button>
          </div>
        </>
      )}

      {/* Modal instance when authenticated capsule is clicked or opened */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
      />
    </div>
  );
};

export default LoginButton;
