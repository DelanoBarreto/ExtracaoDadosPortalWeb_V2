const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fppbzfnaknfpqucwjrhz.supabase.co',
  'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu'
);

async function listAllTables() {
  // We can try to use a raw query if service role allows
  // Actually, we can try to query information_schema.tables via a custom function if it exists,
  // or just try to guess more.
  
  const { data, error } = await supabase.from('tab_lrf').select('*', { count: 'exact', head: true });
  console.log('tab_lrf count:', data ? count : 0);
  if (error) console.log('tab_lrf error:', error.message);

  const { data: d2, error: e2 } = await supabase.from('lrf').select('*', { count: 'exact', head: true });
  if (!e2) console.log('lrf exists');
}

listAllTables();
