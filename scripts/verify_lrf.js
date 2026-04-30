const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fppbzfnaknfpqucwjrhz.supabase.co';
const supabaseKey = 'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('--- Verificando tab_lrf ---');
  const { data, error, count } = await supabase
    .from('tab_lrf')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('Total de registros em tab_lrf:', count);
  if (data && data.length > 0) {
    console.log('Primeiros 5 registros:');
    data.slice(0, 5).forEach(item => {
      console.log(`- ID: ${item.id} | Titulo: ${item.titulo} | MunicipioID: ${item.municipio_id}`);
    });
  } else {
    console.log('Nenhum registro encontrado em tab_lrf.');
  }

  console.log('\n--- Verificando tab_municipios ---');
  const { data: munis } = await supabase.from('tab_municipios').select('id, nome');
  console.log('Municípios cadastrados:');
  munis?.forEach(m => console.log(`- ${m.id}: ${m.nome}`));
}

verify();
