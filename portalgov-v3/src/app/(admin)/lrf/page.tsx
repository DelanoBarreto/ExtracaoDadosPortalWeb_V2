"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Download, ExternalLink,
  ShieldCheck, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, ListChecks, HardDrive
} from 'lucide-react';
import { useMunicipalityStore } from '@/store/municipality';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tipos ────────────────────────────────────────────────────────────────
interface LRFItem {
  id:               string;
  titulo:           string;
  data_publicacao:  string | null;
  arquivo_url:      string | null;
  url_original:     string | null;
  municipio_id:     string;
  tipo:             string | null;
  ano:              number | null;
  competencia:      string | null;
  status:           string | null;
}

// ── Colunas da Tabela (idênticas ao V1) ──────────────────────────────────
const buildColumns = (
  router: ReturnType<typeof useRouter>,
  onDelete: (id: string) => void,
): Column<LRFItem>[] => [
  {
    key:      'titulo',
    label:    'TÍTULO / TIPO',
    sortable: true,
    render:   (val, row) => (
      <div className="max-w-[440px]">
        <p className="text-[0.85rem] text-slate-800 font-medium leading-snug">{val || 'Sem título'}</p>
        <p className="text-[0.7rem] text-emerald-700 flex items-center gap-1 mt-0.5 font-semibold uppercase tracking-tight">
          <ShieldCheck size={10} /> {row.tipo || 'LRF'}
        </p>
      </div>
    ),
  },
  {
    key:      'ano',
    label:    'EXERCÍCIO',
    width:    '100px',
    sortable: true,
    render:   (val, row) => (
      <span className="text-[0.85rem] font-medium text-slate-600">
        {val || (row.data_publicacao ? new Date(row.data_publicacao).getFullYear() : '—')}
      </span>
    ),
  },
  {
    key:    'competencia',
    label:  'REFERÊNCIA',
    width:  '180px',
    render: (val, row) => (
      <span className="text-[0.85rem] text-slate-500">
        {val || (row.data_publicacao ? new Date(row.data_publicacao).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—')}
      </span>
    ),
  },
  {
    key:    'actions',
    label:  'AÇÕES',
    width:  '90px',
    render: (_, row) => (
      <div className="flex items-center justify-end gap-1">
        {row.arquivo_url && (
          <a
            href={row.arquivo_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-transparent hover:border-emerald-200"
            title="Visualizar documento"
          >
            <ExternalLink size={16} />
          </a>
        )}
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

export default function LRFPage() {
  const router       = useRouter();
  const qc           = useQueryClient();
  const { currentMunicipality } = useMunicipalityStore();

  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('Todos');
  const [sortKey,       setSortKey]       = useState('data_publicacao');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [page,          setPage]          = useState(0);
  const pageSize                          = 20;
  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);
  const [confirmClear,  setConfirmClear]  = useState(false);
  const [deleteStorage, setDeleteStorage] = useState(false);

  // ── Stats dinâmicos para as abas ─────────────────────────────────────
  const { data: counts } = useQuery({
    queryKey: ['lrf-counts', currentMunicipality?.id],
    queryFn: async () => {
      const getCount = async (status?: string) => {
        let q = supabase.from('tab_lrf').select('*', { count: 'exact', head: true });
        if (currentMunicipality?.id) q = q.eq('municipio_id', currentMunicipality.id);
        if (status === 'rascunho') q = q.or('status.eq.rascunho,status.is.null');
        else if (status) q = q.eq('status', status);
        const { count } = await q;
        return count || 0;
      };

      const [total, pub, ras, arq] = await Promise.all([
        getCount(),
        getCount('publicado'),
        getCount('rascunho'),
        getCount('arquivado')
      ]);
      return { total, publicado: pub, rascunho: ras, arquivado: arq };
    }
  });

  // ── Query Principal ───────────────────────────────────────────────────
  const { data: result, isLoading } = useQuery({
    queryKey: ['lrf', currentMunicipality?.id, sortKey, sortDir, page, searchQuery, statusFilter],
    queryFn:  async () => {
      const { data } = await axios.get('/api/admin/lrf/fetch', {
        params: {
          municipio_id: currentMunicipality?.id,
          sortKey,
          sortDir,
          page,
          pageSize,
          searchQuery,
          statusFilter
        }
      });
      return data;
    },
  });

  const itens = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ── Mutations ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await axios.post('/api/admin/delete-items', { ids, modulo: 'lrf' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lrf'] });
      qc.invalidateQueries({ queryKey: ['lrf-counts'] });
      setSelectedIds([]);
      setConfirmDelete(null);
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      if (!currentMunicipality?.id) return;
      await axios.delete('/api/admin/clear-data', {
        params: { municipio_id: currentMunicipality.id, modulo: 'lrf', delete_storage: deleteStorage }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lrf'] });
      qc.invalidateQueries({ queryKey: ['lrf-counts'] });
      setConfirmClear(false);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await supabase.from('tab_lrf').update({ status }).in('id', ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lrf'] });
      qc.invalidateQueries({ queryKey: ['lrf-counts'] });
      setSelectedIds([]);
      setDropdownBulkOpen(false);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const columns = buildColumns(router, (id) => setConfirmDelete(id));

  return (
    <div className="flex flex-col gap-8">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-black text-slate-900 leading-tight tracking-tight">
            Gestão Fiscal (LRF)
          </h1>
          <p className="text-slate-500 text-[14px] font-medium mt-1">
            Controle de documentos da Lei de Responsabilidade Fiscal para {currentMunicipality?.name || 'o município'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setConfirmClear(true)}
            className="h-10 px-4 rounded-xl border border-red-100 bg-red-50/50 text-red-600 text-[13px] font-bold hover:bg-red-50 transition-all flex items-center gap-2"
          >
            Limpar Módulo
          </button>
          <button 
            onClick={() => router.push('/lrf/new/edit')}
            className="h-10 px-5 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={18} /> Novo Documento
          </button>
        </div>
      </div>

      {/* ── Status Tabs ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-8 border-b border-slate-200 mb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'Todos', label: 'Todos', count: counts?.total },
          { id: 'Publicado', label: 'Publicado', count: counts?.publicado },
          { id: 'Rascunho', label: 'Rascunho', count: counts?.rascunho },
          { id: 'Arquivado', label: 'Arquivado', count: counts?.arquivado },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setStatusFilter(tab.id); setPage(0); }}
            className={`pb-4 flex items-center gap-2 text-[14px] font-bold transition-all border-b-2 relative ${
              statusFilter === tab.id 
              ? 'text-slate-900 border-slate-900' 
              : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            {tab.label}
            <span className={`text-[11px] ${statusFilter === tab.id ? 'text-slate-500' : 'text-slate-300'}`}>
              {tab.count || 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search & Bulk Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group flex-1 max-w-[320px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#004c99]" />
            <input 
              type="text" 
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full h-11 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setDropdownBulkOpen(!dropdownBulkOpen)}
              disabled={selectedIds.length === 0}
              className={`h-11 px-5 border rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm ${
                selectedIds.length > 0 
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <ListChecks size={18} /> Ações em Lote {selectedIds.length > 0 && `(${selectedIds.length})`} <ChevronDown size={16} />
            </button>
            
            <AnimatePresence>
              {dropdownBulkOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 py-2"
                >
                  <button onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'publicado' })} className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <ShieldCheck size={16} className="text-emerald-500" /> Publicar Selecionados
                  </button>
                  <button onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'rascunho' })} className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <Pencil size={16} className="text-amber-500" /> Mover para Rascunho
                  </button>
                  <button onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'arquivado' })} className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <HardDrive size={16} className="text-slate-400" /> Arquivar Selecionados
                  </button>
                  <div className="h-px bg-slate-100 my-1 mx-2" />
                  <button onClick={() => setConfirmDelete('bulk')} className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-3">
                    <Trash2 size={16} /> Excluir Selecionados
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 border-l border-slate-200">
          {totalItems} REGISTROS
        </div>
      </div>

      {/* ── Data Table Container ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
        <DataTableV2
          data={itens}
          columns={columns}
          selectedIds={selectedIds}
          onSelectChange={ids => setSelectedIds(ids as string[])}
          loading={isLoading}
          emptyMessage="Nenhum documento fiscal encontrado para este município."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />

        {/* ── Pagination ───────────────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
              Página {page + 1} de {totalPages} • Total de {totalItems} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals de Confirmação ─────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                {confirmDelete === 'bulk' 
                  ? `Você está prestes a excluir permanentemente ${selectedIds.length} registros. Esta ação não pode ser desfeita.` 
                  : 'Deseja realmente excluir este documento permanentemente de nossa base de dados?'}
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
                    const ids = confirmDelete === 'bulk' ? selectedIds : [confirmDelete];
                    deleteMutation.mutate(ids);
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-100 transition-all disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmClear && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Limpar Módulo LRF</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-6">
                Esta ação apagará todos os documentos fiscais do município <strong>{currentMunicipality?.name}</strong>.
              </p>
              
              <div 
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mb-8 cursor-pointer border border-slate-100" 
                onClick={() => setDeleteStorage(!deleteStorage)}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${deleteStorage ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                  {deleteStorage && <Plus size={14} className="rotate-45" />}
                </div>
                <span className="text-[13px] font-bold text-slate-600">Apagar também arquivos do Storage</span>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { clearDataMutation.mutate(); }}
                  disabled={clearDataMutation.isPending}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-100 transition-all disabled:opacity-50"
                >
                  {clearDataMutation.isPending ? 'Limpando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
