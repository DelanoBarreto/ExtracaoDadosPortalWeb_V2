"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useMunicipalityStore } from '@/store/municipality';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Building2, ArrowUpRight, Newspaper,
  Files, Users, Zap, TrendingUp, CheckCircle2,
  Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricsData {
  noticias: { total: number; publicado: number; rascunho: number; arquivado: number };
  lrf: { total: number; publicado: number; rascunho: number; arquivado: number };
  secretarias: { total: number };
  ultimas: any[];
  source?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { currentMunicipality } = useMunicipalityStore();

  const { data: stats, isLoading, refetch, dataUpdatedAt } = useQuery<MetricsData>({
    queryKey: ['dashboard-metrics-v4', currentMunicipality?.id],
    queryFn: async () => {
      if (!currentMunicipality?.id) {
        return {
          noticias: { total: 0, publicado: 0, rascunho: 0, arquivado: 0 },
          lrf: { total: 0, publicado: 0, rascunho: 0, arquivado: 0 },
          secretarias: { total: 0 },
          ultimas: [],
        };
      }

      // Métricas + últimas notícias em paralelo
      const [metricsRes, ultimasRes] = await Promise.all([
        fetch(`/api/admin/metrics?municipio_id=${currentMunicipality.id}`),
        supabase
          .from('tab_noticias')
          .select('id, titulo, data_publicacao, status')
          .eq('municipio_id', currentMunicipality.id)
          .order('criado_em', { ascending: false })
          .limit(6),
      ]);

      const metrics = await metricsRes.json();

      return {
        ...metrics,
        ultimas: ultimasRes.data || [],
      };
    },
    enabled: !!currentMunicipality?.id,
    staleTime: 30_000,         // considera fresco por 30s
    refetchInterval: 120_000,  // refetch silencioso a cada 2min
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const diffDias = (new Date().getTime() - date.getTime()) / (1000 * 3600 * 24);
      if (diffDias > 3) return date.toLocaleDateString('pt-BR');
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-[32px] font-black text-slate-900 leading-tight tracking-tight">
            Visão Geral
          </h1>
          <p className="text-slate-500 text-[14px] font-medium mt-1">
            Métricas de moderação e desempenho — {currentMunicipality?.name || 'município'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          title="Atualizar métricas"
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          {lastUpdate ? `Atualizado às ${lastUpdate}` : 'Atualizar'}
        </button>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* Card: Notícias Total */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm cursor-pointer group relative overflow-hidden"
          onClick={() => router.push('/noticias')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#004c99] flex items-center justify-center">
              <Newspaper size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-[#004c99] transition-colors" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Notícias</span>
          <span className="text-[36px] font-black text-slate-900 leading-none">
            {isLoading ? <span className="text-slate-300 text-2xl">...</span> : (stats?.noticias.total ?? 0)}
          </span>
          {/* Mini breakdown */}
          {!isLoading && stats && (
            <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={9} /> {stats.noticias.publicado} pub.
              </span>
              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                <Clock size={9} /> {stats.noticias.rascunho} ras.
              </span>
            </div>
          )}
        </motion.div>

        {/* Card: LRF Total */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm cursor-pointer group relative overflow-hidden"
          onClick={() => router.push('/lrf')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Files size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total LRF</span>
          <span className="text-[36px] font-black text-slate-900 leading-none">
            {isLoading ? <span className="text-slate-300 text-2xl">...</span> : (stats?.lrf.total ?? 0)}
          </span>
          {!isLoading && stats && (
            <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={9} /> {stats.lrf.publicado} pub.
              </span>
              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                <Clock size={9} /> {stats.lrf.rascunho} ras.
              </span>
            </div>
          )}
        </motion.div>

        {/* Card: Secretarias */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm cursor-pointer group relative overflow-hidden"
          onClick={() => router.push('/secretarias')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-orange-600 transition-colors" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Secretarias</span>
          <span className="text-[36px] font-black text-slate-900 leading-none">
            {isLoading ? <span className="text-slate-300 text-2xl">...</span> : (stats?.secretarias.total ?? 0)}
          </span>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidades cadastradas</span>
          </div>
        </motion.div>

        {/* Card: Rascunhos Pendentes (destaque vermelho se > 0) */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              (stats?.noticias.rascunho ?? 0) > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-slate-50 text-slate-400'
            }`}>
              <AlertCircle size={20} />
            </div>
            {(stats?.noticias.rascunho ?? 0) > 0 && (
              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest animate-pulse">
                Pendentes
              </span>
            )}
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rascunhos a Moderar</span>
          <span className={`text-[36px] font-black leading-none ${
            (stats?.noticias.rascunho ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {isLoading ? <span className="text-slate-300 text-2xl">...</span> : ((stats?.noticias.rascunho ?? 0) + (stats?.lrf.rascunho ?? 0))}
          </span>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400">Notícias + LRF combinados</span>
          </div>
        </motion.div>

      </div>

      {/* ── Tabela de Controle Geral ──────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Painel de Controle Central</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Todos os módulos — {currentMunicipality?.name}</p>
          </div>
          <TrendingUp size={18} className="text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total</th>
                <th className="px-6 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Publicado</th>
                <th className="px-6 py-3 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">Rascunho</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Arquivado</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">% Publicado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* Notícias */}
              <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push('/noticias')}>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#004c99] flex items-center justify-center">
                      <Newspaper size={15} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-800">Notícias</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-[15px] font-black text-slate-900">
                  {isLoading ? '–' : stats?.noticias.total ?? 0}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-black text-emerald-600">{isLoading ? '–' : stats?.noticias.publicado ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-black text-amber-600">{isLoading ? '–' : stats?.noticias.rascunho ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-bold text-slate-400">{isLoading ? '–' : stats?.noticias.arquivado ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  {!isLoading && stats && stats.noticias.total > 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.round((stats.noticias.publicado / stats.noticias.total) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {Math.round((stats.noticias.publicado / stats.noticias.total) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-300">—</span>
                  )}
                </td>
              </tr>

              {/* LRF */}
              <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push('/lrf')}>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Files size={15} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-800">Arquivos LRF</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-[15px] font-black text-slate-900">
                  {isLoading ? '–' : stats?.lrf.total ?? 0}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-black text-emerald-600">{isLoading ? '–' : stats?.lrf.publicado ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-black text-amber-600">{isLoading ? '–' : stats?.lrf.rascunho ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-bold text-slate-400">{isLoading ? '–' : stats?.lrf.arquivado ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  {!isLoading && stats && stats.lrf.total > 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.round((stats.lrf.publicado / stats.lrf.total) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {Math.round((stats.lrf.publicado / stats.lrf.total) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-300">—</span>
                  )}
                </td>
              </tr>

              {/* Secretarias */}
              <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push('/secretarias')}>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Users size={15} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-800">Secretarias</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-[15px] font-black text-slate-900">
                  {isLoading ? '–' : stats?.secretarias.total ?? 0}
                </td>
                <td className="px-6 py-4 text-center"><span className="text-slate-300">—</span></td>
                <td className="px-6 py-4 text-center"><span className="text-slate-300">—</span></td>
                <td className="px-6 py-4 text-center"><span className="text-slate-300">—</span></td>
                <td className="px-6 py-4 text-center"><span className="text-slate-300">—</span></td>
              </tr>

              {/* Linha de Totais */}
              {!isLoading && stats && (
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-8 py-3">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Total Geral</span>
                  </td>
                  <td className="px-6 py-3 text-center text-[14px] font-black text-slate-900">
                    {(stats.noticias.total) + (stats.lrf.total) + (stats.secretarias.total)}
                  </td>
                  <td className="px-6 py-3 text-center text-[13px] font-black text-emerald-600">
                    {(stats.noticias.publicado) + (stats.lrf.publicado)}
                  </td>
                  <td className="px-6 py-3 text-center text-[13px] font-black text-amber-600">
                    {(stats.noticias.rascunho) + (stats.lrf.rascunho)}
                  </td>
                  <td className="px-6 py-3 text-center text-[13px] font-bold text-slate-400">
                    {(stats.noticias.arquivado) + (stats.lrf.arquivado)}
                  </td>
                  <td className="px-6 py-3" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Atividade Recente ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col mb-10">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-[16px] font-black text-slate-900 uppercase tracking-tight">Atividade Recente</h2>
            <p className="text-[12px] text-slate-400 font-bold uppercase mt-0.5">Últimas capturas do módulo de notícias</p>
          </div>
          <button
            onClick={() => router.push('/noticias')}
            className="h-9 px-4 rounded-xl bg-white border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2"
          >
            Ver Tudo <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white sticky top-0">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Conteúdo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-50 border-t-[#004c99] rounded-full animate-spin" />
                      <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  </td>
                </tr>
              ) : stats?.ultimas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-[13px] font-bold text-slate-300 uppercase tracking-widest">
                    Nenhuma atividade encontrada no momento.
                  </td>
                </tr>
              ) : (
                stats?.ultimas.map((item: any) => {
                  const isDraft = !item.status || item.status?.toLowerCase() === 'rascunho' || item.status?.toLowerCase() === 'draft';
                  const isArchived = item.status?.toLowerCase() === 'arquivado' || item.status?.toLowerCase() === 'archived';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Newspaper size={14} className="text-blue-500" />
                          <span className="text-[11px] font-black text-slate-400 uppercase">Notícia</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[13px] font-bold text-slate-800 line-clamp-1 max-w-[400px]">{item.titulo}</p>
                      </td>
                      <td className="px-8 py-5 text-[12px] font-medium text-slate-500 text-center">
                        {formatTime(item.data_publicacao)}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isArchived ? 'text-slate-400'
                          : isDraft   ? 'text-amber-600'
                          : 'text-emerald-600'
                        }`}>
                          {isArchived ? 'Arquivado' : isDraft ? 'Rascunho' : 'Publicado'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => router.push(`/noticias/${item.id}/edit`)}
                          className="text-[12px] font-black text-slate-400 hover:text-[#004c99] uppercase tracking-widest transition-colors"
                        >
                          {isDraft ? 'Moderar' : 'Detalhes'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
