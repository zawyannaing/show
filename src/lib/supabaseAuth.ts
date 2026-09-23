import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export interface AuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
}

export { useAuth } from '../hooks/useAuth';

// Built-in default admin emails (can be extended via VITE_ADMIN_EMAILS in .env)
const DEFAULT_ADMIN_EMAILS = [
  'admin',
  'admin@local.host',
  'wayh1360@gmail.com',
  'zawyannaing.yanrx4@gmail.com',
];

export const MOCK_ADMIN_USER: User = {
  id: 'local-admin-001',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'System Admin', name: 'System Admin' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'wayh1360@gmail.com',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString()
};

/**
 * Get all configured admin emails (from env or defaults)
 */
export function getAdminEmails(): string[] {
  const envRaw = import.meta.env.VITE_ADMIN_EMAILS ? String(import.meta.env.VITE_ADMIN_EMAILS) : '';
  const envAdmins = envRaw
    .split(',')
    .map((e: string) => e.replace(/['"]/g, '').trim().toLowerCase())
    .filter(Boolean);
  
  const set = new Set([
    ...DEFAULT_ADMIN_EMAILS.map(e => e.replace(/['"]/g, '').trim().toLowerCase()), 
    ...envAdmins
  ]);
  return Array.from(set);
}

/**
 * Check if a given email belongs to the Admin list
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminList = getAdminEmails();
  return adminList.includes(email.trim().toLowerCase());
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

// In-memory cache for fast synchronous checks
let cachedUser: User | null = null;
let cachedSession: Session | null = null;

// Check localStorage for saved local admin session
if (typeof window !== 'undefined') {
  const savedLocalAdmin = localStorage.getItem('hek_local_admin');
  if (savedLocalAdmin) {
    try {
      cachedUser = JSON.parse(savedLocalAdmin);
    } catch (e) {
      localStorage.removeItem('hek_local_admin');
    }
  }
}

// Initialize cached user from supabase session if not local admin
if (!cachedUser) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!cachedUser) {
      cachedSession = session;
      cachedUser = session?.user ?? null;
    }
  });
}

// Keep cache updated with onAuthStateChange
supabase.auth.onAuthStateChange((_event, session) => {
  if (!localStorage.getItem('hek_local_admin')) {
    cachedSession = session;
    cachedUser = session?.user ?? null;
  }
});

export function extractUserInfo(user: User | null): AuthUserInfo | null {
  if (!user) return null;
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    undefined;

  const email = user.email || '';
  const isAdmin = isEmailAdmin(email) || user.id === 'local-admin-001';

  return {
    id: user.id,
    email,
    name,
    avatarUrl,
    role: isAdmin ? 'admin' : 'user',
    isAdmin
  };
}

export function getCurrentUser(): User | null {
  return cachedUser;
}

export function getCurrentUserInfo(): AuthUserInfo | null {
  return extractUserInfo(cachedUser);
}

export function isAuthenticated(): boolean {
  return !!cachedUser;
}

// Event listeners for local auth changes
const authSubscribers = new Set<(user: User | null, info: AuthUserInfo | null) => void>();

function notifySubscribers() {
  const info = extractUserInfo(cachedUser);
  authSubscribers.forEach(cb => cb(cachedUser, info));
}

/**
 * Sign in with email and password via Supabase Auth (or default admin: admin / admin#$234)
 */
export async function signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
  const trimmedInput = email.trim().toLowerCase();
  
  // 1. Check default local admin credentials (admin / admin#$234)
  if (
    (trimmedInput === 'admin' || trimmedInput === 'admin@local.host' || isEmailAdmin(trimmedInput)) &&
    password === 'admin#$234'
  ) {
    const adminUser: User = {
      ...MOCK_ADMIN_USER,
      email: trimmedInput.includes('@') ? trimmedInput : 'wayh1360@gmail.com'
    };
    cachedUser = adminUser;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hek_local_admin', JSON.stringify(adminUser));
    }
    notifySubscribers();
    return { error: null };
  }

  // 2. Fallback to Supabase Auth
  try {
    const emailToUse = trimmedInput === 'admin' ? 'wayh1360@gmail.com' : email.trim();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });
    if (error) {
      return { error: error.message };
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hek_local_admin');
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to sign in' };
  }
}

/**
 * Sign up with email, password, and full name via Supabase Auth
 */
export async function signUpWithPassword(email: string, password: string, fullName?: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
          name: fullName || email.split('@')[0],
        }
      }
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to sign up' };
  }
}

/**
 * Legacy Google OAuth fallback (deprecated)
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to sign in with Google' };
  }
}

/**
 * Sign out current authenticated user
 */
export async function signOutUser(): Promise<{ error: string | null }> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hek_local_admin');
    }
    const { error } = await supabase.auth.signOut();
    cachedUser = null;
    cachedSession = null;
    notifySubscribers();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    cachedUser = null;
    cachedSession = null;
    notifySubscribers();
    return { error: err?.message || 'Failed to sign out' };
  }
}

/**
 * Subscribe to Supabase Auth changes
 */
export function subscribeAuth(
  callback: (user: User | null, info: AuthUserInfo | null) => void
): () => void {
  authSubscribers.add(callback);

  // Fire immediately with cached state
  callback(cachedUser, extractUserInfo(cachedUser));

  // Also query session to ensure fresh state if not local admin
  if (!cachedUser || cachedUser.id !== 'local-admin-001') {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cachedUser || cachedUser.id !== 'local-admin-001') {
        cachedSession = session;
        cachedUser = session?.user ?? null;
        callback(cachedUser, extractUserInfo(cachedUser));
      }
    });
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!localStorage.getItem('hek_local_admin')) {
      cachedSession = session;
      cachedUser = session?.user ?? null;
      callback(cachedUser, extractUserInfo(cachedUser));
    }
  });

  return () => {
    authSubscribers.delete(callback);
    subscription.unsubscribe();
  };
}

/**
 * React hook to listen for real-time Supabase Auth state changes
 */
export function useSupabaseUser() {
  const [authState, setAuthState] = useState<AuthState>({
    user: cachedUser,
    session: cachedSession,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthState({ user: null, session: null, loading: false, error: error.message });
      } else {
        cachedSession = session;
        cachedUser = session?.user ?? null;
        setAuthState({ user: session?.user ?? null, session, loading: false, error: null });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      cachedSession = session;
      cachedUser = session?.user ?? null;
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const userInfo = extractUserInfo(authState.user);

  return {
    ...authState,
    userInfo,
    userName: userInfo?.name || null,
    userAvatar: userInfo?.avatarUrl || null,
    userEmail: userInfo?.email || null,
    isAdmin: !!userInfo?.isAdmin,
    role: userInfo?.role || 'user',
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut: signOutUser
  };
}
