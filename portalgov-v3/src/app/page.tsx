"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Newspaper, FileText, Building2, ArrowRight,
  RefreshCw, TrendingUp, Database, Zap, Plus,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { usePortalStore } from '@/store/usePortalStore';
import { supabase } from '@/lib/supabase';

// ── Tipos ──────────────────────────────────────────────────────────────
interface StatCard {
  label:    string;
  value:    number | string;
  icon:     React.ElementType;
  path:     string;
  color:    string;
  trend:    string;
  trendUp?: boolean;
}

interface QuickAction {
  label:  string;
  icon:   React.ElementType;
  path:   string;
  color:  string;
}

// ── Formatador ─────────────────────────────────────────────────────────
const fmt = (n: number) => n?.toLocaleString('pt-BR') ?? '—';

export default function DashboardPage() {
  const router = useRouter();
  const { municipioAtivo, setLogPanelOpen } = usePortalStore();

  // Query de stats reais do Supabase
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', municipioAtivo?.id],
    queryFn: async () => {
      if (!municipioAtivo?.id) return { noticias: 0, lrf: 0, secretarias: 0 };

      const [n, l, s] = await Promise.all([
        supabase.from('tab_noticias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
        supabase.from('tab_lrf').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
        supabase.from('tab_secretarias').select('id', { count: 'exact', head: true }).eq('municipio_id', municipioAtivo.id),
      ]);

      return {
        noticias:    n.count    ?? 0,
        lrf:         l.count    ?? 0,
        secretarias: s.count    ?? 0,
      };
    },
    enabled: !!municipioAtivo?.id,
    staleTime: 60_000,
  });

  const statCards: StatCard[] = [
    {
      label:   'Notícias & Atos',
      value:   isLoading ? '...' : fmt(stats?.noticias ?? 0),
      icon:    Newspaper,
      path:    '/noticias',
      color:   'var(--color-primary)',
      trend:   stats?.noticias ? 'Ver registros' : 'Nenhum registro',
      trendUp: (stats?.noticias ?? 0) > 0,
    },
    {
      label:   'Documentos LRF',
      value:   isLoading ? '...' : fmt(stats?.lrf ?? 0),
      icon:    FileText,
      path:    '/lrf',
      color:   'var(--color-primary)',
      trend:   stats?.lrf ? 'Sincronizado' : 'Aguardando',
      trendUp: (stats?.lrf ?? 0) > 0,
    },
    {
      label:   'Secretarias',
      value:   isLoading ? '...' : fmt(stats?.secretarias ?? 0),
      icon:    Building2,
      path:    '/secretarias',
      color:   'var(--color-primary)',
      trend:   stats?.secretarias ? 'Ativas' : 'Sem dados',
      trendUp: (stats?.secretarias ?? 0) > 0,
    },
  ];

  const quickActions: QuickAction[] = [
    { label: '+ Notícia',    icon: Newspaper,  path: '/noticias',   color: 'var(--color-primary)' },
    { label: '+ Doc. LRF',   icon: FileText,   path: '/lrf',        color: 'var(--color-primary)' },
    { label: '+ Secretaria', icon: Building2,  path: '/secretarias', color: 'var(--color-primary)' },
  ];

  const handleScraper = () => {
    setLogPanelOpen(true);
  };

  return (
    <div className="flex flex-col gap-10">
      {/* ── Header Institucional Elite ────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="label-caps !text-[10px] !text-[var(--color-muted)]">Sistema de Gestão Ativo</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--color-ink)] flex items-baseline gap-4">
            {municipioAtivo ? municipioAtivo.nome : 'Configuração Inicial'}
            <span className="text-sm font-medium text-[var(--color-primary)] opacity-60">
              {municipioAtivo?.slug}
            </span>
          </h1>
          <p className="text-[var(--color-ink-secondary)] font-medium mt-1">
            Painel Central de Transparência e Controle Governamental
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-[var(--color-border-soft)] text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all shadow-sm group"
            title="Atualizar Dados"
          >
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
          <button 
            onClick={() => router.push('/noticias')}
            className="px-8 py-4 rounded-2xl bg-[var(--color-primary)] text-white text-sm font-black uppercase tracking-widest shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-3"
          >
            <Plus size={20} />
            Nova Publicação
          </button>
        </div>
      </header>

      {/* ── Grid de KPIs Governamentais ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => router.push(card.path)}
              className="group cursor-pointer bg-white rounded-3xl border border-[var(--color-border-soft)] p-8 shadow-sm hover:shadow-xl hover:border-[var(--color-primary)] transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary-glow)] rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-[var(--color-primary-glow)] group-hover:border-[var(--color-primary)] transition-all">
                  <Icon size={28} className="text-[var(--color-ink)] group-hover:text-[var(--color-primary)]" />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  card.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                }`}>
                  {card.trendUp ? <TrendingUp size={12} /> : <Clock size={12} />}
                  {card.trend}
                </div>
              </div>

              <div className="mt-8 relative z-10">
                <label className="label-caps !text-[10px] mb-2">{card.label}</label>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors">
                    {card.value}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-muted)]">Registros</span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-[var(--color-primary)] opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all">
                Abrir Módulo Completo <ArrowRight size={14} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Seção de Automação e Ações Rápidas ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Motor de Raspagem - High Tech Look */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-7 bg-[#0f172a] rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl group"
        >
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,#1d4ed833,transparent_40%)]" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,#1e293b,transparent_40%)]" />
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center shadow-lg shadow-blue-900">
                  <Zap size={20} className="text-white" />
                </div>
                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[var(--color-primary)] uppercase">Crawler Engine v3.0</span>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-4">
                Automação Inteligente <br />
                <span className="text-slate-500">de Dados Públicos</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                Sincronize automaticamente Atos Oficiais, Notícias e Balanços LRF diretamente da fonte municipal.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={handleScraper}
                className="px-10 py-5 bg-[var(--color-primary)] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(29,78,216,0.3)] hover:bg-[var(--color-primary-hover)] hover:scale-105 transition-all flex items-center gap-3"
              >
                <Database size={18} />
                Executar Crawlers
              </button>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center overflow-hidden">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">IA Integrada</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ações Rápidas Integradas */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-10 border border-[var(--color-border-soft)] shadow-sm">
            <h3 className="text-xl font-extrabold text-[var(--color-ink)] mb-8 flex items-center gap-3">
              <Plus size={24} className="text-[var(--color-primary)]" />
              Criação Rápida
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action) => {
                const AIcon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.path)}
                    className="flex items-center gap-6 p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-[var(--color-primary)] hover:bg-white transition-all group"
                  >
                    <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                      <AIcon size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[var(--color-ink)] uppercase tracking-tight">{action.label}</p>
                      <p className="text-xs text-[var(--color-muted)] font-medium">Novo registro no sistema</p>
                    </div>
                    <ArrowRight size={18} className="ml-auto text-slate-300 group-hover:text-[var(--color-primary)] transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Monitoramento Ativo</p>
              <p className="text-[11px] text-emerald-600 font-bold opacity-80">Conexão estável com Supabase Cloud</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Branding ────────────────────────────────────────── */}
      <footer className="pt-10 border-t border-[var(--color-border-soft)] flex justify-between items-center">
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-[0.3em]">
          Portalgov <span className="text-[var(--color-primary)]">Elite V6</span>
        </p>
        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest flex items-center gap-4">
          <span className="opacity-40">Privacy Policy</span>
          <span className="opacity-40">Gov Standards</span>
          <span>© 2025</span>
        </p>
      </footer>
    </div>
  );
}
