const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fppbzfnaknfpqucwjrhz.supabase.co';
const supabaseKey = 'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNoticias() {
  console.log('--- Verificando tab_noticias ---');
  const { count, error } = await supabase.from('tab_noticias').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Erro:', error.message);
  } else {
    console.log('Total de notícias:', count);
  }

  console.log('\n--- Verificando tab_lrf novamente ---');
  const { count: lrfCount, error: lrfError } = await supabase.from('tab_lrf').select('*', { count: 'exact', head: true });
  if (lrfError) {
    console.error('Erro LRF:', lrfError.message);
  } else {
    console.log('Total LRF:', lrfCount);
  }
}

checkNoticias();
