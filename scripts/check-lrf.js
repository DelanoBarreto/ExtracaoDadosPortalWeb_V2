const { supabase } = require('./src/lib/supabase-bot');

async function checkLRF() {
  const { count } = await supabase
    .from('tab_lrf')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total de registros em tab_lrf: ${count}`);
  
  if (count > 0) {
    const { data } = await supabase.from('tab_lrf').select('url_original').limit(5);
    console.log('Alguns URLs em tab_lrf:');
    data.forEach(d => console.log(` - ${d.url_original}`));
  }
}

checkLRF();
