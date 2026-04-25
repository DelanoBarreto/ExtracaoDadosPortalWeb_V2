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
  Files, Users, Zap, Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const router = useRouter();
  const { currentMunicipality } = useMunicipalityStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats-v3', currentMunicipality?.id],
    queryFn: async () => {
      if (!currentMunicipality?.id) return { noticiasRascunho: 0, lrf: 0, secretarias: 0, ultimas: [] };
      
      const [nR, l, s, ultimasReq] = await Promise.all([
        supabase.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', currentMunicipality.id).eq('status', 'rascunho'),
        supabase.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', currentMunicipality.id),
        supabase.from('tab_secretarias').select('id', { count: 'exact', head: true }).eq('municipio_id', currentMunicipality.id),
        supabase.from('tab_noticias').select('id, titulo, data_publicacao, status').eq('municipio_id', currentMunicipality.id).order('data_publicacao', { ascending: false }).limit(5)
      ]);
      
      return { 
        noticiasRascunho: nR.count ?? 0, 
        lrf: l.count ?? 0, 
        secretarias: s.count ?? 0,
        ultimas: ultimasReq.data || []
      };
    },
    enabled: !!currentMunicipality?.id,
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

  return (
    <div className="flex flex-col gap-8">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="mb-2">
        <h1 className="text-[32px] font-black text-slate-900 leading-tight tracking-tight">
          Visão Geral
        </h1>
        <p className="text-slate-500 text-[14px] font-medium mt-1">
          Métricas de moderação e desempenho do portal de {currentMunicipality?.name || 'município'}
        </p>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1: Notícias */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group cursor-pointer"
          onClick={() => router.push('/noticias')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#004c99] flex items-center justify-center">
              <Newspaper size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-[#004c99] transition-colors" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rascunhos Notícias</span>
          <span className="text-[32px] font-black text-slate-900 leading-none">
            {isLoading ? '...' : stats?.noticiasRascunho}
          </span>
        </motion.div>

        {/* Card 2: LRF */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group cursor-pointer"
          onClick={() => router.push('/lrf')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Files size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Arquivos LRF</span>
          <span className="text-[32px] font-black text-slate-900 leading-none">
            {isLoading ? '...' : stats?.lrf}
          </span>
        </motion.div>

        {/* Card 3: Secretarias */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group cursor-pointer"
          onClick={() => router.push('/secretarias')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-orange-600 transition-colors" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Secretarias</span>
          <span className="text-[32px] font-black text-slate-900 leading-none">
            {isLoading ? '...' : stats?.secretarias}
          </span>
        </motion.div>

        {/* Card 4: Status Crawler */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
              <Zap size={20} />
            </div>
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Crawler Engine</span>
          <span className="text-[20px] font-black text-emerald-600 leading-none uppercase tracking-wider">
            Sincronizado
          </span>
        </motion.div>

      </div>

      {/* ── Recent Activity ─────────────────────────────────────────── */}
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
                  const isDraft = item.status?.toLowerCase() === 'rascunho';
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Newspaper size={14} className="text-blue-500" />
                          <span className="text-[11px] font-black text-slate-400 uppercase">Notícia</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[13px] font-bold text-slate-800 line-clamp-1 max-w-[400px]">
                          {item.titulo}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-[12px] font-medium text-slate-500 text-center">
                        {formatTime(item.data_publicacao)}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isDraft ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {isDraft ? 'Rascunho' : 'Publicado'}
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
