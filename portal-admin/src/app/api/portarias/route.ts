import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');
    const sortKey = searchParams.get('sortKey') || 'data_portaria';
    const sortDir = searchParams.get('sortDir') || 'desc';
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const searchQuery = searchParams.get('searchQuery') || '';
    const statusFilter = searchParams.get('statusFilter') || 'Todos';
    const anoFilter = searchParams.get('anoFilter') || 'Todos';
    const secretariaFilter = searchParams.get('secretariaFilter') || 'Todas';
    const tipo = searchParams.get('tipo');

    let query = supabaseAdmin
      .from('tab_portarias')
      .select('*', { count: 'exact' });

    if (municipio_id) query = query.eq('municipio_id', municipio_id);
    if (tipo) query = query.eq('tipo', tipo);
    if (anoFilter !== 'Todos') query = query.eq('ano', parseInt(anoFilter));
    if (secretariaFilter !== 'Todas') query = query.eq('secretaria', secretariaFilter);
    
    if (searchQuery) {
      query = query.or(`numero.ilike.%${searchQuery}%,detalhamento.ilike.%${searchQuery}%,secretaria.ilike.%${searchQuery}%,tipo.ilike.%${searchQuery}%`);
    }

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
    console.error('❌ Erro no fetch-portarias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.municipio_id) {
      return NextResponse.json(
        { error: 'municipio_id é obrigatório.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('tab_portarias')
      .insert([{
        ...body,
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
