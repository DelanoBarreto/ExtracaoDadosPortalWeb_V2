import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    const base = () => {
      let q = supabaseAdmin.from('tab_secretarias').select('id', { count: 'exact', head: true });
      if (municipio_id) q = q.eq('municipio_id', municipio_id);
      return q;
    };

    const [total, publicado, rascunho] = await Promise.all([
      base().then(({ count }) => count ?? 0),
      base().in('status', ['publicado', 'published']).then(({ count }) => count ?? 0),
      base().or('status.is.null,status.in.(rascunho,draft)').then(({ count }) => count ?? 0),
    ]);

    return NextResponse.json({ total, publicado, rascunho });
  } catch (error: any) {
    console.error('❌ Erro no secretarias-counts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
