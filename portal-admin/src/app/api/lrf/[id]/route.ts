import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('tab_lrf')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('tab_lrf')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar o documento para obter as URLs dos arquivos
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('tab_lrf')
      .select('arquivo_url, anexos')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar LRF para exclusão:', fetchError);
    }

    // 2. Coletar todas as URLs de arquivos (principal + anexos)
    const filesToDelete: string[] = [];
    const bucketName = 'arquivos_municipais';

    const addFilePath = (url: string) => {
      if (!url) return;
      const urlParts = url.split(`${bucketName}/`);
      if (urlParts.length > 1) {
        filesToDelete.push(urlParts[1]);
      }
    };

    if (item?.arquivo_url) addFilePath(item.arquivo_url);
    
    if (Array.isArray(item?.anexos)) {
      item.anexos.forEach((anexo: any) => {
        const url = anexo.url || anexo.storageUrl;
        if (url) addFilePath(url);
      });
    }

    // 3. Excluir arquivos do storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(bucketName)
        .remove(filesToDelete);
      
      if (storageError) {
        console.error('Erro ao excluir arquivos do storage:', storageError);
      }
    }

    // 4. Excluir o registro do banco
    const { error: deleteError } = await supabaseAdmin
      .from('tab_lrf')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na rota de exclusão de LRF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
