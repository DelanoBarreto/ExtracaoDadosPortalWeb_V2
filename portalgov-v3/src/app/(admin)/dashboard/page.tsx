"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePortalStore } from '@/store/usePortalStore';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const router = useRouter();
  const { municipioAtivo } = usePortalStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats-v2', municipioAtivo?.id],
    queryFn: async () => {
      if (!municipioAtivo?.id) return { noticiasRascunho: 0, lrf: 0, secretarias: 0, ultimas: [] };
      
      const [nR, l, s, ultimasReq] = await Promise.all([
        supabase.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id).eq('status', 'rascunho'),
        supabase.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
        supabase.from('tab_secretarias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
        supabase.from('tab_noticias').select('id, titulo, data_publicacao, status').eq('municipio_id', municipioAtivo.id).order('data_publicacao', { ascending: false }).limit(5)
      ]);
      
      return { 
        noticiasRascunho: nR.count ?? 0, 
        lrf: l.count ?? 0, 
        secretarias: s.count ?? 0,
        ultimas: ultimasReq.data || []
      };
    },
    enabled: !!municipioAtivo?.id,
  });

  // Helper para formatar data relativa
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      // Se for mais velho que 3 dias, mostra a data, senão mostra "Há X horas/dias"
      const diffDias = (new Date().getTime() - date.getTime()) / (1000 * 3600 * 24);
      if (diffDias > 3) {
        return date.toLocaleDateString('pt-BR');
      }
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] p-8 font-sans">
      
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#1e293b] tracking-tight">Visão Geral</h1>
        <p className="text-[14px] text-slate-500 font-medium mt-1">Métricas e Moderação</p>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Notícias (Rascunho) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Notícias (Rascunho)</span>
          <span className="text-[32px] font-bold text-[#0f172a] leading-none">
            {isLoading ? '...' : stats?.noticiasRascunho}
          </span>
        </div>

        {/* Card 2: LRF & Atos Oficiais */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">LRF & Atos Oficiais</span>
          <span className="text-[32px] font-bold text-[#0f172a] leading-none">
            {isLoading ? '...' : stats?.lrf}
          </span>
        </div>

        {/* Card 3: Secretarias */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Secretarias</span>
          <span className="text-[32px] font-bold text-[#0f172a] leading-none">
            {isLoading ? '...' : stats?.secretarias}
          </span>
        </div>

        {/* Card 4: Status Crawler */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Status Crawler</span>
          <span className="text-[28px] font-bold text-emerald-500 leading-none tracking-wide">
            ATIVO
          </span>
        </div>

      </div>

      {/* ── Tabela Últimas Capturas ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#1e293b]">Últimas Capturas (Notícias)</h2>
          <button 
            onClick={() => router.push('/noticias')}
            className="text-[13px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            Ver Todos &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Módulo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Título</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Data de Coleta</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                    Carregando dados...
                  </td>
                </tr>
              ) : stats?.ultimas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                    Nenhuma captura recente encontrada.
                  </td>
                </tr>
              ) : (
                stats?.ultimas.map((item: any, idx: number) => {
                  const isDraft = item.status?.toLowerCase() === 'rascunho';
                  
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-[13px] text-slate-500 font-medium">
                        Notícia
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-800 font-medium truncate max-w-[300px]">
                        {item.titulo}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-500">
                        {formatTime(item.data_publicacao)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDraft 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isDraft ? 'Rascunho' : 'Publicado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => router.push(`/noticias/${item.id}/edit`)}
                          className="text-[13px] font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                        >
                          {isDraft ? 'Moderar' : 'Editar'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

