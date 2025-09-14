import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// RN needs fetch & crypto; RN 0.74+ has fetch; @supabase/supabase-js v2 works fine.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export default supabase;
