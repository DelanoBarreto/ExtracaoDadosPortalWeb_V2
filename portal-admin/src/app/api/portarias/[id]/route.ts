import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('tab_portarias')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('tab_portarias')
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
    // 1. Buscar a portaria para pegar a URL do arquivo
    const { data: portaria, error: fetchError } = await supabaseAdmin
      .from('tab_portarias')
      .select('arquivo_url')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Se tiver arquivo no Storage, deletar
    if (portaria?.arquivo_url) {
      const urlParts = portaria.arquivo_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const folderPath = urlParts.slice(urlParts.indexOf('arquivos_municipais') + 1, -1).join('/');
      
      if (folderPath && fileName) {
        await supabaseAdmin.storage
          .from('arquivos_municipais')
          .remove([`${folderPath}/${fileName}`]);
      }
    }

    // 3. Deletar registro do banco
    const { error: deleteError } = await supabaseAdmin
      .from('tab_portarias')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
