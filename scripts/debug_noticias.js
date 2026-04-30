const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fppbzfnaknfpqucwjrhz.supabase.co',
  'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu'
);

async function debugNoticias() {
  const { data, error } = await supabase
    .from('tab_noticias')
    .select('id, titulo, municipio_id');

  console.log('--- Noticias ---');
  console.table(data);
}

debugNoticias();
