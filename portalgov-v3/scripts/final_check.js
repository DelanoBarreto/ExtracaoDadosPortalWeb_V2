const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fppbzfnaknfpqucwjrhz.supabase.co',
  'sb_secret_mj_QAxZFqplN7U9uv_YrRQ_fITwXpPu'
);

async function checkAnyData() {
  const { data, error } = await supabase
    .from('tab_lrf')
    .select('*');

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Rows found:', data.length);
    if (data.length > 0) {
      console.table(data.slice(0, 5));
    }
  }
}

checkAnyData();
