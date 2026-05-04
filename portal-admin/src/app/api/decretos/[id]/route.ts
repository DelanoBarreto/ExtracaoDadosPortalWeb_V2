import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('tab_decretos')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('tab_decretos')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Opcional: Buscar registro primeiro para apagar PDF no Storage
    const { data: record } = await supabaseAdmin
      .from('tab_decretos')
      .select('arquivo_url')
      .eq('id', params.id)
      .single();

    if (record?.arquivo_url) {
      try {
        const path = record.arquivo_url.split('/storage/v1/object/public/arquivos_municipais/')[1];
        if (path) {
          await supabaseAdmin.storage.from('arquivos_municipais').remove([path]);
        }
      } catch (err) {
        console.error('Erro ao deletar PDF do storage:', err);
      }
    }

    const { error } = await supabaseAdmin
      .from('tab_decretos')
      .delete()
      .eq('id', params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
