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
      .select('ano')
      .eq('municipio_id', municipio_id)
      .not('ano', 'is', null)
      .order('ano', { ascending: false });

    if (error) throw error;

    const anos = Array.from(new Set(data?.map(i => i.ano))).filter(Boolean) as number[];

    return NextResponse.json(anos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
