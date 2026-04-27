import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    const base = () => {
      let q = supabaseAdmin.from('tab_lrf').select('id', { count: 'exact', head: true });
      if (municipio_id) q = q.eq('municipio_id', municipio_id);
      return q;
    };

    const [total, publicado, rascunho, arquivado] = await Promise.all([
      // Todos os registros
      base().then(({ count }) => count ?? 0),
      // Status publicado ou published
      base().in('status', ['publicado', 'published']).then(({ count }) => count ?? 0),
      // Null, rascunho ou draft
      base().or('status.is.null,status.in.(rascunho,draft)').then(({ count }) => count ?? 0),
      // Arquivado
      base().in('status', ['arquivado', 'archived']).then(({ count }) => count ?? 0),
    ]);

    return NextResponse.json({ total, publicado, rascunho, arquivado });
  } catch (error: any) {
    console.error('❌ Erro no lrf-counts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
