const { supabase, assertDestructiveAllowed } = require('../src/lib/supabase-bot');

async function resetNoticias() {
  assertDestructiveAllowed('scripts/reset-db.js (apaga todas as notícias do schema extracao)');
  console.log('🗑️ Resetando tabela de notícias...');

  // Filtro que sempre é verdadeiro: o Supabase exige filtro em delete.
  const { error } = await supabase
    .from('noticias')
    .delete()
    .neq('titulo', 'LIMPEZA_TOTAL_DO_BANCO');

  if (error) {
    console.error('❌ Erro ao resetar:', error.message);
  } else {
    console.log('✅ Tabela extracao.noticias zerada com sucesso!');
  }
}

resetNoticias().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
