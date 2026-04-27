import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');
    const sortKey = searchParams.get('sortKey') || 'data_publicacao';
    const sortDir = searchParams.get('sortDir') || 'desc';
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const searchQuery = searchParams.get('searchQuery') || '';
    const statusFilter = searchParams.get('statusFilter') || 'Todos';
    const exercicioFilter = searchParams.get('exercicioFilter') || 'Todos';
    const tipoFilter = searchParams.get('tipoFilter') || 'Todos';

    let query = supabaseAdmin
      .from('tab_lrf')
      .select('id, titulo, data_publicacao, arquivo_url, municipio_id, tipo, status, ano, competencia, url_original', { count: 'exact' });

    if (municipio_id) query = query.eq('municipio_id', municipio_id);
    if (searchQuery) query = query.ilike('titulo', `%${searchQuery}%`);

    if (exercicioFilter !== 'Todos') query = query.eq('ano', exercicioFilter);
    if (tipoFilter !== 'Todos') query = query.eq('tipo', tipoFilter);

    if (statusFilter && statusFilter !== 'Todos') {
      const sf = statusFilter.toLowerCase();
      if (sf === 'rascunho') {
        query = query.or('status.ilike.rascunho,status.is.null');
      } else {
        query = query.ilike('status', sf);
      }
    }

    const { data, error, count } = await query
      .order(sortKey, { ascending: sortDir === 'asc' })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    return NextResponse.json({ data: data ?? [], count: count ?? 0 });

  } catch (error: any) {
    console.error('❌ Erro no fetch-lrf:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('tab_lrf')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar LRF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
