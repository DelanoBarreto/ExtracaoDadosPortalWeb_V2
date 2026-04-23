import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    let query = supabaseAdmin
      .from('tab_noticias')
      .select('*')
      .order('data_publicacao', { ascending: false });

    if (municipio_id) {
      query = query.eq('municipio_id', municipio_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Criar nova notícia manualmente pelo admin
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // municipio_id é obrigatório para não criar registro órfão
    if (!body.municipio_id) {
      return NextResponse.json(
        { error: 'municipio_id é obrigatório para criar uma notícia.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('tab_noticias')
      .insert([{
        ...body,
        data_publicacao: body.data_publicacao || new Date().toISOString(),
        status: body.status || 'rascunho',
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

