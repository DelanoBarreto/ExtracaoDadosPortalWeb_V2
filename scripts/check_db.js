const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fppbzfnaknfpqucwjrhz.supabase.co',
  'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu'
);

async function checkLRF() {
  const { data: lrfData, error: lrfError } = await supabase
    .from('tab_lrf')
    .select('id, titulo, municipio_id, status')
    .limit(5);

  if (lrfError) {
    console.error('Error fetching LRF:', lrfError);
    return;
  }

  console.log('--- Sample LRF Data ---');
  console.table(lrfData);

  const { data: munData, error: munError } = await supabase
    .from('tab_municipios')
    .select('id, nome');

  if (munError) {
    console.error('Error fetching Municipios:', munError);
    return;
  }

  console.log('--- Municipios IDs ---');
  console.table(munData);
}

checkLRF();
