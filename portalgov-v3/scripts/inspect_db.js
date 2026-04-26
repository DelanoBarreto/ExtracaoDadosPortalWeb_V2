const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fppbzfnaknfpqucwjrhz.supabase.co',
  'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu'
);

async function inspectDB() {
  // Check if tab_lrf has ANY data
  const { count, error } = await supabase
    .from('tab_lrf')
    .select('*', { count: 'exact', head: true });

  console.log('Total rows in tab_lrf:', count);
  if (error) console.error('tab_lrf error:', error);

  // Maybe it's lrf without tab_?
  const { count: c2, error: e2 } = await supabase
    .from('lrf')
    .select('*', { count: 'exact', head: true });
  
  if (!e2) console.log('Total rows in lrf:', c2);

  // Check tab_noticias just to see if table naming is consistent
  const { count: c3 } = await supabase
    .from('tab_noticias')
    .select('*', { count: 'exact', head: true });
  console.log('Total rows in tab_noticias:', c3);
}

inspectDB();
