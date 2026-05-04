import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    if (!municipio_id) {
      return NextResponse.json({ error: 'municipio_id é obrigatório' }, { status: 400 });
    }

    // Buscamos os anos únicos usando rpc se existir, ou agrupando na mão
    const { data, error } = await supabaseAdmin
      .from('tab_decretos')
      .select('ano')
      .eq('municipio_id', municipio_id)
      .not('ano', 'is', null);

    if (error) throw error;

    // Retorna array de anos únicos ordenados decrescentemente
    const anosValidos = data
      .map((d: any) => d.ano)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b - a);

    return NextResponse.json(anosValidos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
