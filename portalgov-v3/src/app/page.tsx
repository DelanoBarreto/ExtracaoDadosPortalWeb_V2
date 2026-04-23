"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Newspaper, FileText, Building2, ArrowRight,
  RefreshCw, TrendingUp, Database, Zap, Plus,
  CheckCircle2, Clock, Globe
} from 'lucide-react';
import { usePortalStore } from '@/store/usePortalStore';
import { supabase } from '@/lib/supabase';

// ── Tipos ──────────────────────────────────────────────────────────────
interface StatCard {
  label:    string;
  value:    number | string;
  icon:     React.ElementType;
  path:     string;
  trend:    string;
  trendUp?: boolean;
}

const fmt = (n: number) => n?.toLocaleString('pt-BR') ?? '0';

export default function DashboardPage() {
  const router = useRouter();
  const { municipioAtivo, setLogPanelOpen } = usePortalStore();

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', municipioAtivo?.id],
    queryFn: async () => {
      if (!municipioAtivo?.id) return { noticias: 0, lrf: 0, secretarias: 0 };
      const [n, l, s] = await Promise.all([
        supabase.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
        supabase.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
        supabase.from('tab_secretarias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
      ]);
      return { noticias: n.count ?? 0, lrf: l.count ?? 0, secretarias: s.count ?? 0 };
    },
    enabled: !!municipioAtivo?.id,
  });

  const statCards: StatCard[] = [
    {
      label:   'Notícias & Atos',
      value:   isLoading ? '...' : fmt(stats?.noticias ?? 0),
      icon:    Newspaper,
      path:    '/noticias',
      trend:   stats?.noticias ? 'Em dia' : 'Vazio',
      trendUp: true,
    },
    {
      label:   'Documentos LRF',
      value:   isLoading ? '...' : fmt(stats?.lrf ?? 0),
      icon:    FileText,
      path:    '/lrf',
      trend:   'Sincronizado',
      trendUp: true,
    },
    {
      label:   'Secretarias',
      value:   isLoading ? '...' : fmt(stats?.secretarias ?? 0),
      icon:    Building2,
      path:    '/secretarias',
      trend:   'Estruturado',
      trendUp: true,
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-lg">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PortalGov Cloud</span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Painel Administrativo</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {municipioAtivo ? municipioAtivo.nome : 'Selecione um Município'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 transition-all shadow-sm"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => router.push('/noticias')}
            className="px-5 py-2.5 bg-[#0f172a] text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-md hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={16} /> Nova Publicação
          </button>
        </div>
      </header>

      {/* ── KPI Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(card.path)}
              className="group cursor-pointer bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all text-slate-400 group-hover:text-blue-600">
                  <Icon size={24} />
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  card.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {card.trendUp ? <TrendingUp size={10} /> : <Clock size={10} />}
                  {card.trend}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{card.label}</label>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-slate-900">
                    {card.value}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Itens</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                Acessar Módulo <ArrowRight size={12} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Automation & Scraper ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:col-span-8 bg-[#0f172a] rounded-2xl p-8 relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-blue-400 uppercase">Crawler Engine v3.0</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-3">
                Sincronização de Dados Públicos
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Execute a coleta automatizada de Atos Oficiais e Documentos LRF diretamente dos portais municipais com validação via IA.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setLogPanelOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all flex items-center gap-2 active:scale-95"
              >
                <Database size={16} /> Executar Scrapers
              </button>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center">
                      <div className="w-4 h-4 bg-blue-500/20 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Processamento Ativo</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Atalhos Rápidos
            </h3>
            
            <div className="space-y-2">
              {[
                { label: 'Publicar Notícia', path: '/noticias', icon: Newspaper },
                { label: 'Anexar LRF', path: '/lrf', icon: FileText },
                { label: 'Novo Órgão', path: '/secretarias', icon: Building2 },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-md border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all shadow-sm">
                      <item.icon size={16} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{item.label}</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Sistema Estável</p>
              <p className="text-[9px] text-emerald-600 font-semibold">Conectado ao Cloud Gateway</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
