import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/** New `sb_publishable_*` keys are not JWTs; PostgREST / this stack still expect the legacy anon JWT (`eyJ…`). */
function isUnsupportedAnonKeyShape(key) {
  if (!key) return false;
  return key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');
}

const hasKeys = Boolean(url && anon);
const anonKeyOk = hasKeys && !isUnsupportedAnonKeyShape(anon);

export const isSupabaseConfigured = anonKeyOk;

/** True when a key is set but it's the new `sb_publishable_*` shape (not compatible with this client yet). */
export const isUnsupportedSupabaseAnonKey = hasKeys && !anonKeyOk;

if (hasKeys && !anonKeyOk) {
  console.warn(
    'VITE_SUPABASE_ANON_KEY uses sb_publishable_* / sb_secret_* — use the legacy anon JWT instead (Supabase → Project Settings → API → anon public, long key starting with eyJ).'
  );
}

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
};

function createOfflineAuthStub(wrongKeyMsg) {
  const cfgMsg =
    wrongKeyMsg ||
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

if (!hasKeys) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — auth disabled until configured.');
}

const wrongKeyExplanation =
  hasKeys && !anonKeyOk
    ? 'Invalid key type: use the legacy anon JWT from Supabase Dashboard → Project Settings → API (key starting with eyJ…), not sb_publishable_* or sb_secret_*. Update VITE_SUPABASE_ANON_KEY on Vercel and redeploy.'
    : '';

/** Real Supabase browser client, or offline stub when env is missing (avoids placeholder DNS errors). */
export const supabase = isSupabaseConfigured
  ? createClient(url, anon, { auth: authOptions })
  : createOfflineAuthStub(wrongKeyExplanation || '');
