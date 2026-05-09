import { createClient } from '@supabase/supabase-js';

export function getServerSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase server configuration');
  }

  return createClient(supabaseUrl, supabaseKey);
}
