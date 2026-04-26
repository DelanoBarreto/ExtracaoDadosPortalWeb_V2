const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fppbzfnaknfpqucwjrhz.supabase.co';
const supabaseKey = 'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
  console.log('--- Inspecionando tab_lrf ---');
  // We can't list columns directly without RPC, but we can try to fetch a row and see keys
  // or use an error message from a select * to see if it works.
  
  const { data, error } = await supabase.from('tab_lrf').select('*').limit(1);
  if (error) {
    console.error('Erro ao buscar dados:', error.message);
  } else {
    console.log('Dados encontrados:', data);
  }
}

inspectTable();
