"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, User,
  Pencil, Trash2, Globe, EyeOff, Archive,
  ChevronLeft, ChevronRight, RefreshCw, X
} from 'lucide-react';
import { useMunicipalityStore } from '@/store/municipality';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import { BulkActionDropdown } from '@/components/shared/BulkActionDropdown';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tipos ────────────────────────────────────────────────────────────────
interface Secretaria {
  id:               string;
  nome_secretaria:   string;
  nome_responsavel:  string | null;
  foto_url:         string | null;
  municipio_id:     string;
  status:           string | null;
}

// ── Colunas da Tabela (V4 Elite) ──────────────────────────────────────────
const buildColumns = (
  router: ReturnType<typeof useRouter>,
  onDelete:  (id: string) => void,
): Column<Secretaria>[] => [
  {
    key:    'foto_url',
    label:  'FOTO',
    width:  '80px',
    render: (val) => (
      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 shadow-sm mx-auto">
        {val ? (
          <img src={val} alt="Titular" className="w-full h-full object-cover" />
        ) : (
          <User size={16} className="text-slate-400" />
        )}
      </div>
    ),
  },
  {
    key:      'nome_responsavel',
    label:    'RESPONSÁVEL / TITULAR',
    width:    '220px',
    sortable: true,
    render:   (val) => (
      <span className="text-[0.85rem] text-slate-800 font-bold truncate block">
        {val || 'Não informado'}
      </span>
    ),
  },
  {
    key:      'nome_secretaria',
    label:    'SECRETARIA / ÓRGÃO',
    sortable: true,
    render:   (val, row) => (
      <div className="max-w-[620px]">
        <p
          className="text-[0.85rem] text-slate-800 font-medium hover:text-[#004c99] cursor-pointer"
          onClick={() => router.push(`/secretarias/${row.id}/edit`)}
        >
          {val || 'Sem nome'}
        </p>
      </div>
    ),
  },
  {
    key:    'status',
    label:  'STATUS',
    width:  '130px',
    render: (val) => {
      const status = val?.toLowerCase() || 'rascunho';
      const isPublicado = ['publicado', 'published'].includes(status);
      const isArquivado = ['arquivado', 'archived'].includes(status);
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
          isPublicado ? 'bg-[#DCFCE7] text-[#166534]'
          : isArquivado ? 'bg-slate-100 text-slate-500'
          : 'bg-[#FEF3C7] text-[#92400E]'
        }`}>
          {isPublicado ? 'Publicado' : isArquivado ? 'Arquivado' : 'Rascunho'}
        </span>
      );
    },
  },
  {
    key:    'actions',
    label:  'AÇÕES',
    width:  '80px',
    render: (_, row) => (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/secretarias/${row.id}/edit`); }}
          className="p-1.5 text-slate-500 hover:text-[#004c99] hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-200"
          title="Editar"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
          className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200"
          title="Excluir"
        >
          <Trash2 size={16} />
        </button>
      </div>
    ),
  },
];

export default function SecretariasPage() {
  const router       = useRouter();
  const qc           = useQueryClient();
  const { currentMunicipality } = useMunicipalityStore();

  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('Todos');
  const [sortKey,       setSortKey]       = useState('nome_secretaria');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');
  const [page,          setPage]          = useState(0);
  const pageSize                          = 20;

  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);

  // ── Stats dinâmicos ──────────────────────────────────────────────────
  const { data: counts } = useQuery({
    queryKey: ['secretarias-counts', currentMunicipality?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/secretarias/counts', {
        params: { municipio_id: currentMunicipality?.id }
      });
      return data;
    },
    enabled: !!currentMunicipality?.id,
  });

  // ── Query Principal ───────────────────────────────────────────────────
  const { data: result, isLoading } = useQuery({
    queryKey: ['secretarias', currentMunicipality?.id, sortKey, sortDir, page, searchQuery, statusFilter],
    queryFn:  async () => {
      let query = supabase
        .from('tab_secretarias')
        .select('id, nome_secretaria, nome_responsavel, foto_url, municipio_id, status', { count: 'exact' });

      if (currentMunicipality?.id) query = query.eq('municipio_id', currentMunicipality.id);
      if (searchQuery) query = query.ilike('nome_secretaria', `%${searchQuery}%`);

      if (statusFilter !== 'Todos') {
        const sf = statusFilter.toLowerCase();
        if (sf === 'publicado') query = query.in('status', ['publicado', 'published']);
        else if (sf === 'rascunho') query = query.in('status', ['rascunho', 'draft', null]);
        else if (sf === 'arquivado') query = query.in('status', ['arquivado', 'archived']);
      }

      const { data, error, count } = await query
        .order(sortKey as any, { ascending: sortDir === 'asc' })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const secretarias = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ── Mutations ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map(id => axios.delete(`/api/secretarias/${id}`))
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['secretarias'] });
      qc.invalidateQueries({ queryKey: ['secretarias-counts'] });
      setSelectedIds([]);
      setConfirmDelete(null);
    },
  });

  // Altera status de múltiplos registros
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await Promise.all(
        ids.map(id => axios.put(`/api/secretarias/${id}`, { status }))
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['secretarias'] });
      qc.invalidateQueries({ queryKey: ['secretarias-counts'] });
      setSelectedIds([]);
      setDropdownBulkOpen(false);
    },
  });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const columns = buildColumns(router, (id) => setConfirmDelete(id));

  return (
    <div className="flex flex-col gap-4">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 leading-tight tracking-tight">
            Secretarias
          </h1>
          <p className="text-slate-500 text-[13px] font-medium">Gerencie os órgãos e responsáveis do município</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['secretarias'] });
              qc.invalidateQueries({ queryKey: ['secretarias-counts'] });
            }}
            disabled={isLoading}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button 
            onClick={() => router.push('/secretarias/new/edit')}
            className="h-9 px-4 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100 cursor-pointer"
          >
            <Plus size={16} /> Novo Órgão
          </button>
        </div>
      </div>

      {/* ── Status Tabs ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'Todos', label: 'Todos', count: counts?.total },
          { id: 'Publicado', label: 'Publicado', count: counts?.publicado },
          { id: 'Rascunho', label: 'Rascunho', count: counts?.rascunho },
          { id: 'Arquivado', label: 'Arquivado', count: counts?.arquivado },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setStatusFilter(tab.id); setPage(0); }}
            className={`pb-1.5 flex items-center gap-2 text-[13px] font-bold transition-all border-b-2 relative ${
              statusFilter === tab.id 
              ? 'text-slate-900 border-slate-900' 
              : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] ${statusFilter === tab.id ? 'text-slate-500' : 'text-slate-300'}`}>
              {tab.count || 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search & Bulk Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group flex-1 max-w-[320px]">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#004c99]" />
            <input 
              type="text" 
              placeholder="Buscar secretarias..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full h-9 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <BulkActionDropdown 
            selectedCount={selectedIds.length}
            actions={[
              { label: 'Publicar Selecionados', icon: Globe, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'publicado' }), color: 'text-emerald-500' },
              { label: 'Mover para Rascunho', icon: Pencil, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'rascunho' }), color: 'text-amber-500' },
              { label: 'Arquivar Selecionados', icon: Archive, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'arquivado' }), color: 'text-slate-400' },
              { label: 'SEPARATOR', icon: X, onClick: () => {} },
              { label: 'Excluir Selecionados', icon: Trash2, onClick: () => setConfirmDelete('bulk'), variant: 'danger' }
            ]}
          />
        </div>

        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5 border-l border-slate-200">
          {totalItems} ITENS
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
        <DataTableV2
          data={secretarias}
          columns={columns}
          selectedIds={selectedIds}
          onSelectChange={ids => setSelectedIds(ids as string[])}
          loading={isLoading}
          emptyMessage="Nenhuma secretaria encontrada."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(row) => router.push(`/secretarias/${row.id}/edit`)}
        />

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="text-[12px] font-bold text-slate-400 uppercase">
              Página {page + 1} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                Esta ação excluirá permanentemente os registros selecionados. Não pode ser desfeita.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const ids = confirmDelete === 'bulk' ? selectedIds : [confirmDelete as string];
                    deleteMutation.mutate(ids);
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 disabled:opacity-60 transition-colors"
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
