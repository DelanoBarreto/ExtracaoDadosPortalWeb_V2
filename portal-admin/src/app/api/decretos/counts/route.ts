import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    if (!municipio_id) {
      return NextResponse.json({ error: 'municipio_id é obrigatório' }, { status: 400 });
    }

    // Conta o total absoluto do município
    const { count: total } = await supabaseAdmin
      .from('tab_decretos')
      .select('*', { count: 'exact', head: true })
      .eq('municipio_id', municipio_id);

    // Conta Publicados
    const { count: publicado } = await supabaseAdmin
      .from('tab_decretos')
      .select('*', { count: 'exact', head: true })
      .eq('municipio_id', municipio_id)
      .ilike('status', 'publicado');

    // Conta Rascunho (null é considerado rascunho)
    const { count: rascunho } = await supabaseAdmin
      .from('tab_decretos')
      .select('*', { count: 'exact', head: true })
      .eq('municipio_id', municipio_id)
      .or('status.ilike.rascunho,status.is.null');

    // Conta Arquivados
    const { count: arquivado } = await supabaseAdmin
      .from('tab_decretos')
      .select('*', { count: 'exact', head: true })
      .eq('municipio_id', municipio_id)
      .ilike('status', 'arquivado');

    return NextResponse.json({
      total: total || 0,
      publicado: publicado || 0,
      rascunho: rascunho || 0,
      arquivado: arquivado || 0
    });
  } catch (error: any) {
    console.error('❌ Erro no fetch counts decretos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
