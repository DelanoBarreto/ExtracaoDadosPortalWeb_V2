import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { ids, modulo } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !modulo) {
      return NextResponse.json({ error: 'Parâmetros ids (array) e modulo são obrigatórios.' }, { status: 400 });
    }

    // 1. Identificar tabela e coluna de arquivo
    let table = '';
    let fileColumn = '';
    if (modulo === 'noticias') {
      table = 'tab_noticias';
      fileColumn = 'imagem_url';
    } else if (modulo === 'lrf') {
      table = 'tab_lrf';
      fileColumn = 'arquivo_url';
    } else if (modulo === 'secretarias') {
      table = 'tab_secretarias';
      fileColumn = 'foto_url';
    } else {
      return NextResponse.json({ error: 'Módulo inválido.' }, { status: 400 });
    }

    // 2. Buscar as URLs dos arquivos antes de deletar os registros
    const { data: items, error: fetchError } = await supabaseAdmin
      .from(table)
      .select(`id, ${fileColumn}`)
      .in('id', ids);

    if (fetchError) throw fetchError;

    // 3. Remover arquivos do Storage
    const bucket = 'arquivos_municipais';
    const filesToRemove: string[] = [];

    items?.forEach(item => {
      const url = item[fileColumn];
      if (url && typeof url === 'string' && url.includes(bucket)) {
        // Extrai o path do arquivo da URL do Supabase
        // Formato esperado: .../storage/v1/object/public/BUCKET/PATH
        const parts = url.split(`${bucket}/`);
        if (parts.length > 1) {
          const filePath = decodeURIComponent(parts[1]);
          filesToRemove.push(filePath);
        }
      }
    });

    if (filesToRemove.length > 0) {
      console.log(`🗑️ Removendo ${filesToRemove.length} arquivos do storage...`);
      const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove(filesToRemove);
      if (storageError) {
        console.warn('⚠️ Erro ao remover arquivos do storage:', storageError.message);
      }
    }

    // 4. Deletar registros do Banco de Dados
    const { error: dbError } = await supabaseAdmin
      .from(table)
      .delete()
      .in('id', ids);

    if (dbError) throw dbError;

    return NextResponse.json({ 
      message: `${ids.length} itens removidos com sucesso.`,
      filesRemoved: filesToRemove.length
    });

  } catch (error: any) {
    console.error('❌ Erro no delete-items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
