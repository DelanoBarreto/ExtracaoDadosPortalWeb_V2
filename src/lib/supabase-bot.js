require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Usando a Secret Key para o Scraper

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis SUPABASE_URL e SUPABASE_SECRET_KEY devem estar configuradas no .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
