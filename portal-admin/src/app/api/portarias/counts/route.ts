import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    if (!municipio_id) {
      return NextResponse.json({ error: 'municipio_id é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('tab_portarias')
      .select('status')
      .eq('municipio_id', municipio_id);

    if (error) throw error;

    const total = data?.length || 0;
    const publicado = data?.filter(i => !i.status || i.status === 'publicado').length || 0;
    const rascunho = data?.filter(i => i.status === 'rascunho').length || 0;
    const arquivado = data?.filter(i => i.status === 'arquivado').length || 0;

    return NextResponse.json({ total, publicado, rascunho, arquivado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
