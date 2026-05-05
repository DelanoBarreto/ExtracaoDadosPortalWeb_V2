import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('tab_municipios')
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
      .from('tab_municipios')
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

    // 1. Buscar município para obter imagens
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('tab_municipios')
      .select('logo_url, brasao_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar municipio para exclusão:', fetchError);
    }

    // 2. Preparar lista de arquivos para deletar
    const filesToDelete: string[] = [];
    const bucketName = 'arquivos_municipais';

    const addFilePath = (url: string) => {
      if (!url) return;
      const urlParts = url.split(`${bucketName}/`);
      if (urlParts.length > 1) {
        filesToDelete.push(urlParts[1]);
      }
    };

    if (item?.logo_url) addFilePath(item.logo_url);
    if (item?.brasao_url) addFilePath(item.brasao_url);

    // 3. Deletar do Storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(bucketName)
        .remove(filesToDelete);
      
      if (storageError) {
        console.error('Erro ao excluir imagens do storage:', storageError);
      }
    }

    // 4. Deletar registro
    const { error } = await supabaseAdmin
      .from('tab_municipios')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
