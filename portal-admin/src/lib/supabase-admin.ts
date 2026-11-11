import { createClient } from '@supabase/supabase-js';
import { SUPABASE_DB_SCHEMA, SUPABASE_URL, getSupabaseSecretKey } from './supabase-env';

// Cliente administrativo para operações seguras no backend (API Routes)
export const supabaseAdmin = createClient<any, typeof SUPABASE_DB_SCHEMA>(SUPABASE_URL, getSupabaseSecretKey(), {
  db: { schema: SUPABASE_DB_SCHEMA },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
