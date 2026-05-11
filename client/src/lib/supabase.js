import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — auth disabled until configured.');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
