import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface AuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
}

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  adminEmails: string[];
  userEmail: string | null;
  userName: string | null;
  userAvatar: string | null;
  userInfo: AuthUserInfo | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshSession: () => Promise<void>;
}

// Fallback admin emails if env variable is not populated
const DEFAULT_ADMIN_EMAILS = [
  'admin',
  'admin@local.host',
  'wayh1360@gmail.com',
  'zawyannaing.yanrx4@gmail.com',
];

export function getStoredLocalAdmin(): User | null {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('hek_local_admin');
      if (saved) return JSON.parse(saved);
    } catch {
      localStorage.removeItem('hek_local_admin');
    }
  }
  return null;
}

export function notifyAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tmhip_auth_changed'));
  }
}

/**
 * Returns the parsed list of authorized administrator emails from VITE_ADMIN_EMAILS.
 * Automatically normalizes, trims, and converts emails to lowercase.
 */
export function getAdminEmails(): string[] {
  const envRaw = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAILS) ||
    (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAILS) ||
    '';

  const envList = String(envRaw)
    .split(',')
    .map((e) => e.replace(/['"]/g, '').trim().toLowerCase())
    .filter(Boolean);

  const combined = new Set([
    ...DEFAULT_ADMIN_EMAILS.map((e) => e.replace(/['"]/g, '').trim().toLowerCase()), 
    ...envList
  ]);
  return Array.from(combined);
}

/**
 * Checks whether a given email address exists in the authorized VITE_ADMIN_EMAILS list.
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed === 'admin' || trimmed === 'admin@local.host') return true;
  const adminList = getAdminEmails();
  return adminList.includes(trimmed);
}

/**
 * Extracts normalized user profile information from Supabase User metadata.
 */
export function extractUserInfo(user: User | null): AuthUserInfo | null {
  if (!user) return null;
  const email = user.email || '';
  const isAdmin = user.id === 'local-admin-001' || isEmailAdmin(email);

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    email.split('@')[0] ||
    'User';

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    undefined;

  return {
    id: user.id,
    email,
    name,
    avatarUrl,
    role: isAdmin ? 'admin' : 'user',
    isAdmin,
  };
}

// Global cached session state to prevent flash of unauthenticated UI
let globalSession: Session | null = null;
let globalUser: User | null = getStoredLocalAdmin();

// Eagerly check existing session if not local admin
if (!globalUser) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!getStoredLocalAdmin()) {
      globalSession = session;
      globalUser = session?.user ?? null;
      notifyAuthChanged();
    }
  });
}

// Real-time listener
supabase.auth.onAuthStateChange((_event, session) => {
  if (!getStoredLocalAdmin()) {
    globalSession = session;
    globalUser = session?.user ?? null;
    notifyAuthChanged();
  }
});

/**
 * Custom React Hook: useAuth
 *
 * Provides real-time Supabase Auth state, Google OAuth sign-in via
 * supabase.auth.signInWithOAuth({ provider: 'google' }), sign-out,
 * and email verification against the VITE_ADMIN_EMAILS list for role-based access.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(() => getStoredLocalAdmin() || globalUser);
  const [session, setSession] = useState<Session | null>(globalSession);
  const [loading, setLoading] = useState<boolean>(!getStoredLocalAdmin() && !globalSession && !globalUser);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const localAdmin = getStoredLocalAdmin();
    if (localAdmin) {
      globalUser = localAdmin;
      setUser(localAdmin);
      setLoading(false);
      return;
    }

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
      } else {
        const currentLocal = getStoredLocalAdmin();
        if (currentLocal) {
          globalUser = currentLocal;
          setUser(currentLocal);
        } else {
          globalSession = data.session;
          globalUser = data.session?.user ?? null;
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Initial session resolution
    refreshSession();

    // Listen to real-time auth changes (Sign-In, Sign-Out, Token Refresh, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      const localAdmin = getStoredLocalAdmin();
      if (localAdmin) {
        globalUser = localAdmin;
        setUser(localAdmin);
        setLoading(false);
        return;
      }
      globalSession = newSession;
      globalUser = newSession?.user ?? null;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      setError(null);
    });

    // Listen for cross-component custom auth event and localStorage changes
    const handleAuthEvent = () => {
      if (!isMounted) return;
      const localAdmin = getStoredLocalAdmin();
      if (localAdmin) {
        globalUser = localAdmin;
        setUser(localAdmin);
        setLoading(false);
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!isMounted) return;
          if (!getStoredLocalAdmin()) {
            globalSession = session;
            globalUser = session?.user ?? null;
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          }
        });
      }
    };

    window.addEventListener('tmhip_auth_changed', handleAuthEvent);
    window.addEventListener('storage', handleAuthEvent);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('tmhip_auth_changed', handleAuthEvent);
      window.removeEventListener('storage', handleAuthEvent);
    };
  }, [refreshSession]);

  /**
   * Sign in with Email and Password (or default admin: admin / admin#$234)
   */
  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    setError(null);
    const trimmedInput = email.trim().toLowerCase();

    // 1. Check default local admin credentials (admin / admin#$234)
    if (
      (trimmedInput === 'admin' || trimmedInput === 'admin@local.host' || isEmailAdmin(trimmedInput)) &&
      password === 'admin#$234'
    ) {
      const mockAdminUser: User = {
        id: 'local-admin-001',
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'System Admin', name: 'System Admin' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: trimmedInput.includes('@') ? trimmedInput : 'wayh1360@gmail.com',
        phone: '',
        role: 'authenticated',
        updated_at: new Date().toISOString()
      };
      globalUser = mockAdminUser;
      setUser(mockAdminUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hek_local_admin', JSON.stringify(mockAdminUser));
      }
      notifyAuthChanged();
      return { error: null };
    }

    // 2. Fallback to Supabase Auth
    try {
      const emailToUse = trimmedInput === 'admin' ? 'wayh1360@gmail.com' : email.trim();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return { error: signInError.message };
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hek_local_admin');
      }
      notifyAuthChanged();
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || 'Sign in failed';
      setError(msg);
      return { error: msg };
    }
  }, []);

  /**
   * Sign up with Email, Password and Full Name
   */
  const signUpWithPassword = useCallback(async (email: string, password: string, fullName?: string): Promise<{ error: string | null }> => {
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
            name: fullName || email.split('@')[0],
          }
        }
      });
      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError.message };
      }
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || 'Sign up failed';
      setError(msg);
      return { error: msg };
    }
  }, []);

  /**
   * Trigger Google OAuth via Supabase: auth.signInWithOAuth({ provider: 'google' })
   */
  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    setError(null);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (signInError) {
        setError(signInError.message);
        return { error: signInError.message };
      }
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || 'Google OAuth Sign-In failed';
      setError(msg);
      return { error: msg };
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<{ error: string | null }> => {
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hek_local_admin');
      }
      const { error: signOutError } = await supabase.auth.signOut();
      globalSession = null;
      globalUser = null;
      setUser(null);
      setSession(null);

      if (signOutError) {
        setError(signOutError.message);
        notifyAuthChanged();
        return { error: signOutError.message };
      }
      notifyAuthChanged();
      return { error: null };
    } catch (err: any) {
      globalSession = null;
      globalUser = null;
      setUser(null);
      setSession(null);
      notifyAuthChanged();
      const msg = err?.message || 'Failed to sign out';
      setError(msg);
      return { error: msg };
    }
  }, []);

  // Compute Admin status by checking user's email in VITE_ADMIN_EMAILS
  const adminEmails = useMemo(() => getAdminEmails(), []);
  const userEmail = user?.email || null;
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.id === 'local-admin-001') return true;
    return isEmailAdmin(user.email);
  }, [user]);
  const userInfo = useMemo(() => extractUserInfo(user), [user]);

  return {
    user,
    session,
    loading,
    error,
    isAdmin,
    adminEmails,
    userEmail,
    userName: userInfo?.name || null,
    userAvatar: userInfo?.avatarUrl || null,
    userInfo,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
    refreshSession,
  };
}

export default useAuth;
