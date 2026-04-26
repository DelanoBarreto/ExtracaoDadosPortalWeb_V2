const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fppbzfnaknfpqucwjrhz.supabase.co';
const supabaseKey = 'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['lrf', 'relatorios_lrf', 'transparencia_lrf', 'tab_lrf'];
  for (const t of tables) {
    console.log(`Verificando tabela: ${t}...`);
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  - Erro ou tabela inexistente: ${error.message}`);
    } else {
      console.log(`  - OK! Total de registros: ${count}`);
    }
  }
}

check();
