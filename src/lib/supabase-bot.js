require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Chave secreta (servidor) para o Scraper
const dbSchema = process.env.SUPABASE_DB_SCHEMA || 'extracao';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis SUPABASE_URL e SUPABASE_SECRET_KEY devem estar configuradas no .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: dbSchema } });

/**
 * Trava para scripts que apagam dados: só roda com ALLOW_DESTRUCTIVE=1 e fora de produção.
 * O banco apontado é o PortalGov-Producao (compartilhado), então apagar exige ato explícito.
 */
function assertDestructiveAllowed(actionName) {
  const isProd = (process.env.APP_ENV || '').toLowerCase().startsWith('prod');
  if (process.env.ALLOW_DESTRUCTIVE !== '1' || isProd) {
    throw new Error(
      `Bloqueado: "${actionName}" apaga dados do banco compartilhado. ` +
      'Use ALLOW_DESTRUCTIVE=1 e APP_ENV diferente de production, de propósito.'
    );
  }
}

module.exports = { supabase, dbSchema, assertDestructiveAllowed };
