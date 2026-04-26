const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fppbzfnaknfpqucwjrhz.supabase.co',
  'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu'
);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); 
  // If RPC is not available, we might try a raw query if service role allows
  // But usually we don't have get_tables RPC.
  
  // Let's try to just select from a few likely candidates
  const candidates = ['tab_lrf', 'tab_noticias', 'tab_municipios', 'tab_secretarias', 'tab_documentos', 'lrf'];
  
  for (const table of candidates) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`Table ${table}:`, error ? 'Error/Not Found' : count + ' rows');
  }
}

listTables();
