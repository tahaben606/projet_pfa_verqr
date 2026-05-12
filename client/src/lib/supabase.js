import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(url && anon);

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
};

function createOfflineAuthStub() {
  const cfgMsg =
    'Supabase missing: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Project Settings → Environment Variables, then redeploy (Vite bakes these in at build time).';

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange() {
        return {
          data: {
            subscription: { unsubscribe() {} },
          },
        };
      },
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: new Error(cfgMsg),
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: new Error(cfgMsg),
      }),
      signOut: async () => ({ error: null }),
    },
  };
}

if (!isSupabaseConfigured) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — auth disabled until configured.');
}

/** Real Supabase browser client, or offline stub when env is missing (avoids placeholder DNS errors). */
export const supabase = isSupabaseConfigured
  ? createClient(url, anon, { auth: authOptions })
  : createOfflineAuthStub();
