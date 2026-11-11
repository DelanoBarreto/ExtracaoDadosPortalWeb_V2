/**
 * Configuração única de conexão com o Supabase (PortalGov-Producao).
 * Aceita os nomes novos das chaves (publishable/secret) e os legados (anon/service_role).
 * O schema padrão é `extracao`; as demais áreas (portalgov, plataforma) são acessadas
 * apenas por funções do banco, nunca por escrita direta.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Somente servidor. Nunca importar em componentes de cliente. */
export const getSupabaseSecretKey = (): string =>
  (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!;

export const SUPABASE_DB_SCHEMA = 'extracao' as const;
