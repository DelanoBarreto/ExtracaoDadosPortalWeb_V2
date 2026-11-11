import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_DB_SCHEMA, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './supabase-env';

/**
 * Cliente Supabase para uso em Server Components e Server Actions.
 * Lê/escreve a sessão via cookies HTTP.
 * NÃO use este cliente em API Routes — use o supabaseAdmin lá.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<any, typeof SUPABASE_DB_SCHEMA>(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
    {
      db: { schema: SUPABASE_DB_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components não podem setar cookies — o middleware cuida disso
          }
        },
      },
    }
  );
}
