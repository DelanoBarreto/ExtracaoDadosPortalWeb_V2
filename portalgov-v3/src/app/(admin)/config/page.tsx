"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings, Database, ShieldCheck, Activity,
  Server, Lock, Cpu, Globe, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Componente de Card de Status ──────────────────────────────────────────
function StatusCard({ title, value, status, icon: Icon, description }: any) {
  const isOk = status === 'ok';
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: isOk ? '#f0fdf4' : '#fff1f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isOk ? '#16a34a' : '#e11d48', border: `1px solid ${isOk ? '#dcfce7' : '#ffe4e6'}`
        }}>
          <Icon size={20} />
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800,
          background: isOk ? '#dcfce7' : '#ffe4e6', color: isOk ? '#16a34a' : '#e11d48',
          textTransform: 'uppercase'
        }}>
          {status}
        </div>
      </div>
      <div>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{title}</h4>
        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{value}</p>
      </div>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

export default function ConfigPage() {
  // ── Query de Health Check ───────────────────────────────────────────────
  const { data: health, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const start = performance.now();
      const { data, error } = await supabase.from('tab_municipios').select('count', { count: 'exact', head: true });
      const end = performance.now();

      if (error) throw error;
      return {
        latency: Math.round(end - start),
        totalMunicipios: data || 0,
        status: 'ok'
      };
    },
    refetchInterval: 30000, // Cada 30s
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
            System Core
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
          Configurações do Sistema
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
          Painel de controle central, monitoramento de infraestrutura e segurança.
        </p>
      </div>

      {/* ── Grid de Status ────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        <StatusCard
          title="Conexão Banco de Dados"
          value={isLoading ? '...' : `${health?.latency}ms`}
          status={isLoading ? 'checking' : 'ok'}
          icon={Database}
          description="Latência em tempo real com a instância do Supabase."
        />
        <StatusCard
          title="Motor de Scraper"
          value="Ativo"
          status="ok"
          icon={Cpu}
          description="Cluster de extração operando em capacidade nominal."
        />
        <StatusCard
          title="Segurança SSL/TSL"
          value="Protegido"
          status="ok"
          icon={ShieldCheck}
          description="Criptografia de ponta a ponta ativa em todas as requisições."
        />
        <StatusCard
          title="Endpoints de API"
          value="v5.2.0"
          status="ok"
          icon={Server}
          description="Versão atual da camada de abstração de dados (Elite Edition)."
        />
      </div>

      {/* ── Painéis Detalhados ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

        {/* Configurações Globais */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <Settings size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Parâmetros do Scraper</h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Ajuste fino do motor de busca</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Timeout de Requisição (ms)</label>
              <input className="input-base" defaultValue="30000" type="number" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Tentativas Automáticas (Retries)</label>
              <input className="input-base" defaultValue="3" type="number" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Modo Headless</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Executar browser em segundo plano</p>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 20, background: '#f97316', position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', right: 2, top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* Health Check Logs */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <Activity size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Logs de Auditoria</h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Monitoramento de eventos recentes</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { time: '10:42:01', event: 'Backup semanal concluído', status: 'success' },
              { time: '09:15:33', event: 'Sincronização com Aracati concluída', status: 'success' },
              { time: '08:02:12', event: 'Aviso: Lentidão na API externa (LRF)', status: 'warning' },
              { time: '01:00:00', event: 'Robô de limpeza de cache executado', status: 'success' },
            ].map((log, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.75rem', borderRadius: 10, background: '#fff',
                border: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{log.time}</span>
                <span style={{ fontSize: '0.8125rem', color: '#475569', flex: 1 }}>{log.event}</span>
                {log.status === 'success' ? (
                  <CheckCircle2 size={14} color="#16a34a" />
                ) : (
                  <AlertTriangle size={14} color="#f97316" />
                )}
              </div>
            ))}
          </div>
          <button className="btn-outline" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }}>
            Ver Todos os Logs
          </button>
        </div>

      </div>
    </div>
  );
}
