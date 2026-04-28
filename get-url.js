const { supabase } = require('./src/lib/supabase-bot');

async function getRealUrl() {
  const { data } = await supabase.from('tab_noticias').select('url_original').limit(1).single();
  console.log('REAL URL:', data.url_original);
}

getRealUrl();
