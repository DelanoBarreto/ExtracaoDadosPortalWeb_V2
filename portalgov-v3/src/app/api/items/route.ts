import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// PUT /api/items - Atualizar registro indiviual
export async function PUT(request: Request) {
  try {
    const { id, table, data } = await request.json();

    if (!id || !table || !data) {
      return NextResponse.json({ error: 'Faltam parâmetros: id, table, data' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Item atualizado com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/items - Deletar Registro + Arquivo no Storage
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const table = searchParams.get('table');
    const bucket = searchParams.get('bucket');
    const file_url = searchParams.get('file_url');

    if (!id || !table) {
      return NextResponse.json({ error: 'Faltam parâmetros: id, table' }, { status: 400 });
    }

    // 1. Deletar do Storage se houver URL
    if (file_url && bucket) {
      const pathParts = file_url.split(`${bucket}/`);
      if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1]);
        await supabaseAdmin.storage.from(bucket).remove([filePath]);
      }
    }

    // 2. Deletar do Banco
    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ message: 'Item e arquivo removidos com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
