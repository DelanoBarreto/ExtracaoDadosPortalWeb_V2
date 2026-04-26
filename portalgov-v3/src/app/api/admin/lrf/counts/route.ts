import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    const getCount = async (status?: string) => {
      let q = supabaseAdmin.from('tab_lrf').select('*', { count: 'exact', head: true });
      if (municipio_id) q = q.eq('municipio_id', municipio_id);
      if (status === 'rascunho') q = q.or('status.eq.rascunho,status.is.null');
      else if (status === 'publicado') q = q.eq('status', 'publicado');
      else if (status === 'arquivado') q = q.eq('status', 'arquivado');
      const { count } = await q;
      return count ?? 0;
    };

    const [total, publicado, rascunho, arquivado] = await Promise.all([
      getCount(),
      getCount('publicado'),
      getCount('rascunho'),
      getCount('arquivado'),
    ]);

    return NextResponse.json({ total, publicado, rascunho, arquivado });
  } catch (error: any) {
    console.error('❌ Erro no lrf-counts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
