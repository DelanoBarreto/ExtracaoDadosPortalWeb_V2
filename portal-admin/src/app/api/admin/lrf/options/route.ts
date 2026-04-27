import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    if (!municipio_id) {
      return NextResponse.json({ error: 'municipio_id is required' }, { status: 400 });
    }

    // Busca tipos únicos
    const { data: tiposData, error: tiposError } = await supabaseAdmin
      .from('tab_lrf')
      .select('tipo')
      .eq('municipio_id', municipio_id)
      .not('tipo', 'is', null);

    if (tiposError) throw tiposError;

    // Busca competências únicas
    const { data: compData, error: compError } = await supabaseAdmin
      .from('tab_lrf')
      .select('competencia')
      .eq('municipio_id', municipio_id)
      .not('competencia', 'is', null);

    if (compError) throw compError;

    // Processa os resultados para obter valores únicos e limpos
    const tipos = Array.from(new Set(tiposData.map(item => item.tipo))).sort();
    const competencias = Array.from(new Set(compData.map(item => item.competencia))).sort();

    return NextResponse.json({
      tipos,
      competencias
    });
  } catch (error: any) {
    console.error('Error fetching LRF options:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
