import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const municipioId   = searchParams.get('municipio_id');
  const statusFilter  = searchParams.get('status_filter') ?? 'Todos';
  const search        = searchParams.get('search') ?? '';
  const sortKey       = searchParams.get('sort_key') ?? 'is_atual';
  const sortDir       = searchParams.get('sort_dir') ?? 'desc';
  const page          = parseInt(searchParams.get('page') ?? '0', 10);
  const pageSize      = parseInt(searchParams.get('page_size') ?? '20', 10);
  const status        = searchParams.get('status'); // legacy param

  if (!municipioId) {
    return NextResponse.json({ error: 'Falta municipio_id' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('tab_gestores')
    .select('*', { count: 'exact' })
    .eq('municipio_id', municipioId);

  // Filtro de busca
  if (search) {
    query = query.ilike('nome', `%${search}%`);
  }

  // Filtro de status (novo padrão com status_filter)
  if (statusFilter !== 'Todos') {
    const sf = statusFilter.toLowerCase();
    if (sf === 'publicado')  query = query.in('status', ['publicado', 'published']);
    else if (sf === 'rascunho') query = query.in('status', ['rascunho', 'draft']);
    else if (sf === 'arquivado') query = query.in('status', ['arquivado', 'archived']);
  }

  // Filtro de status legado (status=all ou status=publicado etc.)
  if (status && status !== 'all' && statusFilter === 'Todos') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order(sortKey as any, { ascending: sortDir === 'asc' })
    .order('data_inicio', { ascending: false, nullsFirst: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('tab_gestores')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
