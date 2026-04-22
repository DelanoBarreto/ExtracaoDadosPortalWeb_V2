import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const municipio_id = searchParams.get('municipio_id');
  const modulo = searchParams.get('modulo');
  const delete_storage = searchParams.get('delete_storage') === 'true';

  if (!municipio_id || !modulo) {
    return NextResponse.json({ error: 'Parâmetros municipio_id e modulo são obrigatórios.' }, { status: 400 });
  }

  try {
    // 1. Identificar tabela e bucket
    let table = '';
    if (modulo === 'noticias') table = 'tab_noticias';
    else if (modulo === 'lrf') table = 'tab_lrf';
    else if (modulo === 'secretarias') table = 'tab_secretarias';
    else {
      return NextResponse.json({ error: 'Módulo inválido.' }, { status: 400 });
    }

    // 2. Buscar nome do município para o Storage (se for deletar arquivos)
    let municipio_nome = '';
    if (delete_storage) {
      const { data: mun } = await supabaseAdmin
        .from('tab_municipios')
        .select('nome')
        .eq('id', municipio_id)
        .single();
      
      if (mun) municipio_nome = mun.nome;
    }

    let storageCleared = 0;

    // 3. Limpar Storage (se solicitado e se houver nome do município)
    if (delete_storage && municipio_nome) {
      const bucket = 'arquivos_municipais';
      let folderName = modulo;
      if (modulo === 'lrf') folderName = 'LRF';
      else if (modulo === 'secretarias') folderName = 'Secretarias';
      // noticias already matches 'noticias'
      
      const folderPath = `${municipio_nome}/${folderName}`;

      console.log(`🗑️ Limpando storage: bucket=${bucket}, path=${folderPath}`);

      // Listar arquivos na pasta (limite de 1000 para segurança)
      const { data: files, error: listError } = await supabaseAdmin.storage.from(bucket).list(folderPath, { limit: 1000 });

      if (listError) {
        console.warn(`⚠️ Aviso ao listar arquivos:`, listError.message);
      } else if (files && files.length > 0) {
        const pathsToDelete = files.map(f => `${folderPath}/${f.name}`);
        const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(pathsToDelete);
        
        if (removeError) {
          console.error(`❌ Erro ao remover arquivos:`, removeError.message);
        } else {
          storageCleared = files.length;
        }
      }
    }

    // 4. Limpar Banco de Dados
    const { error: dbError } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('municipio_id', municipio_id);

    if (dbError) throw dbError;

    return NextResponse.json({ 
      message: `Módulo ${modulo} limpo com sucesso para o município.`,
      storageCleared
    });

  } catch (error: any) {
    console.error('❌ Erro no clear-data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
