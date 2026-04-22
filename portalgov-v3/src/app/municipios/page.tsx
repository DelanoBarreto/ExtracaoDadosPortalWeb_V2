"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, MapPin, Globe,
  Settings, Pencil, Trash2, RefreshCw, Palette
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';

// ── Tipos ─────────────────────────────────────────────────────────────────
interface Municipio {
  id:           string;
  nome:         string;
  slug:         string;
  cor_primaria: string | null;
  status:       string | null;
}

// ── Colunas ───────────────────────────────────────────────────────────────
const buildColumns = (
  router: ReturnType<typeof useRouter>,
  onDelete: (id: string) => void,
): Column<Municipio>[] => [
  {
    key:      'nome',
    label:    'Cidade / Município',
    sortable: true,
    render:   (val, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: '#f8fafc',
          border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#94a3b8'
        }}>
          <MapPin size={20} />
        </div>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>{val}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>/{row.slug}</p>
        </div>
      </div>
    ),
  },
  {
    key:      'visual',
    label:    'Identidade',
    width:    '180px',
    render:   (_, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 16, height: 16, borderRadius: '50%',
            background: row.cor_primaria || '#4B9C8E',
            boxShadow: '0 0 0 2px #fff, 0 0 0 3px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
          {row.cor_primaria || '#4B9C8E'}
        </span>
      </div>
    ),
  },
  {
    key:    'status',
    label:  'Status',
    width:  '140px',
    render: (val) => {
      const isActive = val === 'ativo';
      return (
        <span className={isActive ? 'badge badge-published' : 'badge badge-archived'} style={{ padding: '4px 10px' }}>
          {isActive ? 'ATIVO' : 'INATIVO'}
        </span>
      );
    },
  },
  {
    key:    'id',
    label:  'Ações',
    width:  '100px',
    render: (val) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/municipios/${val}/edit`); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, border: '1px solid #e2e8f0',
            borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b',
          }}
          title="Configurações"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(val); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, border: '1px solid #fecaca',
            borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#dc2626',
          }}
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>
    ),
  },
];

// ── Página ─────────────────────────────────────────────────────────────────
export default function MunicipiosPage() {
  const router = useRouter();
  const qc     = useQueryClient();

  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [sortKey,       setSortKey]       = useState('nome');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);

  // ── Query ────────────────────────────────────────────────────────────────
  const { data: municipios = [], isLoading, refetch } = useQuery<Municipio[]>({
    queryKey: ['tab_municipios', sortKey, sortDir],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('tab_municipios')
        .select('id, nome, slug, cor_primaria, status')
        .order(sortKey as any, { ascending: sortDir === 'asc' });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Sincronização Realtime ───────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes-municipios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tab_municipios' },
        () => {
          console.log('🔄 Mudança detectada em tab_municipios, atualizando...');
          qc.invalidateQueries({ queryKey: ['tab_municipios'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // ── Filtro ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    municipios.filter(n =>
      n.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.slug?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [municipios, searchQuery]
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('tab_municipios').delete().in('id', ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tab_municipios'] });
      setSelectedIds([]);
      setConfirmDelete(null);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await supabase.from('tab_municipios').update({ status }).in('id', ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tab_municipios'] });
      setSelectedIds([]);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort    = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const handleDelete  = (id: string) => setConfirmDelete(id);
  const confirmDeletion = () => {
    const ids = confirmDelete === 'bulk' ? selectedIds : [confirmDelete!];
    deleteMutation.mutate(ids);
  };

  const columns = buildColumns(router, handleDelete);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header Corporativo Elite ────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-[var(--shadow-primary)]">
            <Globe size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="label-caps !text-[10px]">Ecossistema PortalGov</span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="label-caps !text-[10px] !text-[var(--color-primary)]">Configuração Global</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--color-ink)]">
              Municípios & Portais
            </h1>
            <p className="text-sm font-bold text-[var(--color-muted)] mt-1">
              {isLoading ? 'Mapeando instâncias...' : `Gerenciando ${filtered.length} portais ativos no ecossistema`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => refetch()}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-[var(--color-border-soft)] text-[var(--color-ink-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all shadow-sm"
            title="Sincronizar"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => router.push('/municipios/new/edit')}
            className="px-8 py-3.5 bg-[var(--color-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={18} />
            Novo Município
          </button>
        </div>
      </header>

      {/* ── Barra de Busca ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
          <input
            className="w-full h-14 pl-14 pr-6 bg-white border-2 border-slate-50 rounded-2xl text-sm font-bold text-[var(--color-ink)] placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] outline-none transition-all shadow-sm"
            placeholder="Buscar por nome da cidade, slug ou identificador único..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Container da Tabela ────────────────────────────────────────── */}
      <div className="bg-white rounded-[2.5rem] border border-[var(--color-border-soft)] shadow-xl overflow-hidden">
        <DataTableV2
          data={filtered}
          columns={columns}
          selectedIds={selectedIds}
          onSelectChange={ids => setSelectedIds(ids as string[])}
          loading={isLoading}
          emptyMessage="Nenhum município cadastrado no ecossistema."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* ── Ações em Lote ─────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          count={selectedIds.length}
          loading={bulkStatusMutation.isPending || deleteMutation.isPending}
          onPublish={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'ativo' })}
          onArchive={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'inativo' })}
          onDelete={() => setConfirmDelete('bulk')}
          onClear={() => setSelectedIds([])}
        />
      )}

      {/* ── Modal de Confirmação ───────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-8">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-[var(--color-ink)] mb-3">
              Confirmar Exclusão
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              {confirmDelete === 'bulk'
                ? `Você está prestes a remover permanentemente ${selectedIds.length} municípios. Esta ação é irreversível e afetará todos os dados vinculados a estas instâncias.`
                : 'Esta instância de município e todos os seus dados vinculados serão removidos permanentemente. Confirma esta operação?'}
            </p>
            <div className="flex gap-4">
              <button 
                className="flex-1 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(239,68,68,0.2)] transition-all"
                onClick={confirmDeletion}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
