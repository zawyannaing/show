import { createClient } from '@supabase/supabase-js';

// Supabase URL and Key provided by user
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://wdezdoqnbvfvwnsuysfn.supabase.co';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  'sb_publishable_9HuDL813Pxf6--IR5Uyd9Q_qAh09p7R';

// Resilient fetch wrapper to handle transient network errors, ISP blocks, and QUIC drops
const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    // If direct Supabase connection fails (e.g. TypeError: Failed to fetch due to ISP blocks on *.supabase.co)
    // automatically re-route the request via our server's /api/supabase proxy!
    if (typeof window !== 'undefined') {
      try {
        const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
        if (urlStr.includes('supabase.co')) {
          const parsed = new URL(urlStr);
          const proxyUrl = `/api/supabase${parsed.pathname}${parsed.search}`;
          return await fetch(proxyUrl, init);
        }
      } catch (proxyError) {
        // Continue to throw original error if proxy also fails
      }
    }
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: resilientFetch,
  },
});

export interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

