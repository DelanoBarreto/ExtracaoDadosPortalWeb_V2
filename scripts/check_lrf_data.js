const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fppbzfnaknfpqucwjrhz.supabase.co';
const supabaseKey = 'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['lrf', 'relatorios_lrf', 'transparencia_lrf', 'tab_lrf'];
  for (const t of tables) {
    console.log(`Buscando dados em: ${t}...`);
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`  - Erro: ${error.message}`);
    } else {
      console.log(`  - OK! Dados encontrados: ${data.length}`);
      if (data.length > 0) console.log(data[0]);
    }
  }
}

check();
