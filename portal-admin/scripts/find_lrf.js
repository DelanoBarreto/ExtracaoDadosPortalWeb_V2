const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fppbzfnaknfpqucwjrhz.supabase.co',
  'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu'
);

async function findLRF() {
  // Try to find ANY table that starts with tab_ and contains lrf
  // We can't query information_schema directly via SDK usually
  // But we can try to "guess" or use a raw SQL if possible.
  
  // Let's try some variations
  const vars = ['tab_lrf', 'lrf', 'documentos_lrf', 'tb_lrf', 'transparencia_lrf'];
  for (const v of vars) {
    const { data, error } = await supabase.from(v).select('*').limit(1);
    if (!error) {
      const { count } = await supabase.from(v).select('*', { count: 'exact', head: true });
      console.log(`FOUND TABLE: ${v} with ${count} rows`);
    }
  }
}

findLRF();
