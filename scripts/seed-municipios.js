const { supabase } = require('./src/lib/supabase-bot');

async function seedMunicipios() {
  console.log('🚀 Iniciando cadastro de municípios...');

  const { data, error } = await supabase
    .from('tab_municipios')
    .upsert([
      { 
        nome: 'Aracati', 
        url_base: 'https://aracati.ce.gov.br',
        ativo: true 
      }
    ], { onConflict: 'url_base' });

  if (error) {
    console.error('❌ Erro ao cadastrar município:', error.message);
  } else {
    console.log('✅ Município Aracati cadastrado/atualizado com sucesso!');
  }
}

seedMunicipios();
