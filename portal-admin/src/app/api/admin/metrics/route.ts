import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/metrics?municipio_id=UUID
 * 
 * Retorna todas as métricas consolidadas de um município em uma única chamada.
 * Usa a tab_dashboard_totals para leitura instantânea sem sobrecarga de CPU.
 * Fallback para contagem direta se a tabela ainda não tiver sido criada/populada.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipio_id = searchParams.get('municipio_id');

    if (!municipio_id) {
      return NextResponse.json({ error: 'municipio_id é obrigatório' }, { status: 400 });
    }

    // Tenta ler da tabela de métricas pré-calculadas (rápido)
    const { data: rows, error: tableError } = await supabaseAdmin
      .from('tab_dashboard_totals')
      .select('modulo, status, quantidade')
      .eq('municipio_id', municipio_id);

    // Se a tabela existir e tiver dados, usa ela
    if (!tableError && rows && rows.length > 0) {
      const metrics = buildMetricsFromRows(rows);
      return NextResponse.json({ source: 'cached', ...metrics });
    }

    // Fallback: contagem direta (caso a tabela ainda não exista ou esteja vazia)
    const metrics = await countDirectly(municipio_id);
    return NextResponse.json({ source: 'direct', ...metrics });

  } catch (error: any) {
    console.error('❌ Erro em /api/admin/metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildMetricsFromRows(rows: { modulo: string; status: string; quantidade: number }[]) {
  const get = (modulo: string, status: string) =>
    rows.find((r) => r.modulo === modulo && r.status === status)?.quantidade ?? 0;

  return {
    noticias: {
      total: get('noticias', 'total'),
      publicado: get('noticias', 'publicado'),
      rascunho: get('noticias', 'rascunho'),
      arquivado: get('noticias', 'arquivado'),
    },
    lrf: {
      total: get('lrf', 'total'),
      publicado: get('lrf', 'publicado'),
      rascunho: get('lrf', 'rascunho'),
      arquivado: get('lrf', 'arquivado'),
    },
    secretarias: {
      total: get('secretarias', 'total'),
    },
  };
}

async function countDirectly(municipio_id: string) {
  const [nTotal, nPub, nRas, nArq, lTotal, lPub, lRas, lArq, sTotal] = await Promise.all([
    // Notícias
    supabaseAdmin.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id),
    supabaseAdmin.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id).in('status', ['publicado', 'published']),
    supabaseAdmin.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id).or('status.is.null,status.in.(rascunho,draft)'),
    supabaseAdmin.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id).in('status', ['arquivado', 'archived']),
    // LRF
    supabaseAdmin.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id),
    supabaseAdmin.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id).in('status', ['publicado', 'published']),
    supabaseAdmin.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id).or('status.is.null,status.in.(rascunho,draft)'),
    supabaseAdmin.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id).in('status', ['arquivado', 'archived']),
    // Secretarias
    supabaseAdmin.from('tab_secretarias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipio_id),
  ]);

  return {
    noticias: {
      total:     nTotal.count   ?? 0,
      publicado: nPub.count     ?? 0,
      rascunho:  nRas.count     ?? 0,
      arquivado: nArq.count     ?? 0,
    },
    lrf: {
      total:     lTotal.count   ?? 0,
      publicado: lPub.count     ?? 0,
      rascunho:  lRas.count     ?? 0,
      arquivado: lArq.count     ?? 0,
    },
    secretarias: {
      total: sTotal.count ?? 0,
    },
  };
}
