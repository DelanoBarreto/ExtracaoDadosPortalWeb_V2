const { supabase } = require('./src/lib/supabase-bot');

async function configStorage() {
  console.log('📦 Configurando Storage do Supabase...');

  const { data, error } = await supabase.storage.createBucket('arquivos_municipais', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf']
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket "arquivos_municipais" já existe.');
    } else {
      console.error('❌ Erro ao criar bucket:', error.message);
    }
  } else {
    console.log('✅ Bucket "arquivos_municipais" criado com sucesso!');
  }
}

configStorage();
