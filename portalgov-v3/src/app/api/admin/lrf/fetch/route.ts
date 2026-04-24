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

    let query = supabaseAdmin
      .from('tab_lrf')
      .select('id, titulo, data_publicacao, arquivo_url, municipio_id, tipo, status', { count: 'exact' });

    if (municipio_id) {
      query = query.eq('municipio_id', municipio_id);
    }

    if (searchQuery) {
      query = query.ilike('titulo', `%${searchQuery}%`);
    }

    if (statusFilter && statusFilter !== 'Todos') {
      const sf = statusFilter.toLowerCase();
      if (sf === 'rascunho') {
        query = query.or('status.eq.rascunho,status.is.null');
      } else {
        query = query.eq('status', sf);
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
