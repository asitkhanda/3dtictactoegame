import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// keepalive lets small requests (e.g. the presence update fired from
// beforeunload) complete even while the page is being torn down.
const keepaliveFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, keepalive: true });

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      global: { fetch: keepaliveFetch },
    })
  : (null as unknown as ReturnType<typeof createClient<Database>>);
