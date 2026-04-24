"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, MapPin, Globe,
  Settings, Trash2, RefreshCw
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
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
          <MapPin size={16} />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm leading-tight">{val}</p>
          <p className="text-[10px] text-slate-400 font-mono">/{row.slug}</p>
        </div>
      </div>
    ),
  },
  {
    key:      'visual',
    label:    'Identidade',
    width:    '180px',
    render:   (_, row) => (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full border border-black/5 shadow-sm"
          style={{ background: row.cor_primaria || '#4B9C8E' }}
        />
        <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-tight">
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
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
          isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
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
      <div className="flex gap-2 justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/municipios/${val}/edit`); }}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-border-color bg-white text-text-primary hover:bg-gray-50 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          title="Configurações"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(val); }}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
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
    <div className="flex flex-col h-full bg-bg-main">
      {/* ── Main Header ────────────────────────────────────────────── */}
      <header className="px-8 pt-6 pb-4 bg-white flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-city-hall-blue text-white flex items-center justify-center shadow-sm">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PortalGov</span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-city-hall-accent uppercase tracking-widest">Infraestrutura</span>
            </div>
            <h1 className="text-xl font-bold text-city-hall-blue tracking-tight">
              Municípios & Portais
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-color bg-white text-text-primary hover:bg-gray-50 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => router.push('/municipios/new/edit')}
            className="px-4 py-2 bg-city-hall-accent text-white rounded-md text-[13px] font-medium hover:bg-city-hall-blue transition-colors flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <Plus size={16} /> Novo Município
          </button>
        </div>
      </header>

      {/* ── Search & Filter ───────────────────────────────────────── */}
      <div className="mb-6">
        <div className="relative group max-w-2xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            className="w-full h-11 pl-11 pr-4 bg-white border border-border-color rounded-md text-[13px] font-semibold text-text-primary placeholder:text-slate-400 focus:bg-white focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 outline-none transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            placeholder="Buscar por nome da cidade ou slug..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Data Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTableV2
          data={filtered}
          columns={columns}
          selectedIds={selectedIds}
          onSelectChange={ids => setSelectedIds(ids as string[])}
          loading={isLoading}
          emptyMessage="Nenhum município cadastrado."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* ── Bulk Actions ──────────────────────────────────────────── */}
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

      {/* ── Confirmation Modal ────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
          >
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Confirmar Exclusão
            </h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
              {confirmDelete === 'bulk'
                ? `Você está prestes a remover permanentemente ${selectedIds.length} municípios. Esta ação é irreversível e afetará todos os dados vinculados a estas instâncias.`
                : 'Esta instância de município e todos os seus dados vinculados serão removidos permanentemente. Confirma esta operação?'}
            </p>
            <div className="flex gap-3">
              <button 
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-200 transition-all"
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
