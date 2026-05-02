import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('tab_secretarias')
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
      .from('tab_secretarias')
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

    // 1. Buscar a secretaria para obter a URL da foto
    const { data: secretaria, error: fetchError } = await supabaseAdmin
      .from('tab_secretarias')
      .select('foto_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar secretaria para exclusão:', fetchError);
    }

    // 2. Se houver uma foto, tentar excluir do storage
    if (secretaria?.foto_url) {
      const bucketName = 'arquivos_municipais';
      // Tenta extrair o path relativo do storage a partir da URL pública
      const urlParts = secretaria.foto_url.split(`${bucketName}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: storageError } = await supabaseAdmin.storage
          .from(bucketName)
          .remove([filePath]);
        
        if (storageError) {
          console.error('Erro ao excluir imagem do storage:', storageError);
        }
      }
    }

    // 3. Excluir o registro do banco
    const { error: deleteError } = await supabaseAdmin
      .from('tab_secretarias')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na rota de exclusão de secretaria:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
