import { createClient } from '@supabase/supabase-js';
import { SUPABASE_DB_SCHEMA, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './supabase-env';

export const supabase = createClient<any, typeof SUPABASE_DB_SCHEMA>(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  db: { schema: SUPABASE_DB_SCHEMA },
});
