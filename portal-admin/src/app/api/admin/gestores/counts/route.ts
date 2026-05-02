import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const municipioId = searchParams.get('municipio_id');

  if (!municipioId) {
    return NextResponse.json({ error: 'Falta municipio_id' }, { status: 400 });
  }

  // Busca todos os itens apenas com os campos necessários para contar
  const { data, error } = await supabaseAdmin
    .from('tab_gestores')
    .select('status')
    .eq('municipio_id', municipioId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = {
    total: data.length,
    publicado: data.filter(d => ['publicado', 'published'].includes(d.status?.toLowerCase())).length,
    rascunho: data.filter(d => ['rascunho', 'draft', null, ''].includes(d.status?.toLowerCase())).length,
    arquivado: data.filter(d => ['arquivado', 'archived'].includes(d.status?.toLowerCase())).length,
  };

  return NextResponse.json(counts);
}
