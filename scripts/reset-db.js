const { supabase } = require('./src/lib/supabase-bot');

async function resetNoticias() {
  console.log('🗑️ Resetando tabela de notícias...');
  
  // No Supabase, se não houver um delete sem filtro habilitado nas políticas, 
  // precisamos de um filtro que pegue tudo.
  const { error } = await supabase
    .from('tab_noticias')
    .delete()
    .neq('titulo', 'LIMPEZA_TOTAL_DO_BANCO'); // Filtro que sempre será verdadeiro se o título não for esse literal

  if (error) {
    console.error('❌ Erro ao resetar:', error.message);
  } else {
    console.log('✅ Tabela tab_noticias zerada com sucesso!');
  }
}

resetNoticias();
