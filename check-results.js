const { supabase } = require('./src/lib/supabase-bot');

async function checkResults() {
  console.log('📊 Verificando registros na tab_noticias...');

  const { data, count, error } = await supabase
    .from('tab_noticias')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('❌ Erro ao buscar notícias:', error.message);
  } else {
    console.log(`✅ Total de notícias salvas: ${count}`);
    console.log('--- Resumo das 3 primeiras ---');
    data.slice(0, 3).forEach(n => {
      console.log(`- Título: ${n.titulo}`);
      console.log(`  URL: ${n.url_original}`);
      console.log(`  Imagem: ${n.imagem_url}`);
    });
  }
}

checkResults();
