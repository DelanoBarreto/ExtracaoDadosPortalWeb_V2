"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
  HardDrive, Globe, X, Save, Loader2, RefreshCw,
  HardDrive as HardDriveIcon, LayoutGrid, Table as TableIcon
} from 'lucide-react';
import { useMunicipalityStore } from '@/store/municipality';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import { BulkActionDropdown } from '@/components/shared/BulkActionDropdown';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// ── Helper de badge de status ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  const s = status?.toLowerCase() || '';
  const isPublicado = s === 'publicado';
  const isRascunho  = s === 'rascunho' || !status;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase ${
      isPublicado ? 'bg-[#DCFCE7] text-[#166534]'
      : isRascunho ? 'bg-[#FEF3C7] text-[#92400E]'
      : 'bg-slate-100 text-slate-600'
    }`}>
      {isPublicado ? 'Publicado' : isRascunho ? 'Rascunho' : status}
    </span>
  );
}

// ── Colunas da Tabela ─────────────────────────────────────────────────────
const buildColumns = (
  onEdit:   (row: LRFItem) => void,
  onDelete: (id: string) => void,
): Column<LRFItem>[] => [
  {
    key:      'titulo',
    label:    'DOCUMENTO / IDENTIFICAÇÃO',
    sortable: true,
    render:   (val, row) => (
      <div className="max-w-[520px]">
        <p 
          className="text-[13px] text-slate-800 font-medium hover:text-[#004c99] cursor-pointer transition-colors line-clamp-2 leading-tight flex items-center gap-2"
          onClick={() => onEdit(row)}
          title={val}
        >
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black border border-emerald-100 shrink-0">
            {row.tipo || 'LRF'}
          </span>
          {val || 'Sem título'}
        </p>
      </div>
    ),
  },
  {
    key:      'data_publicacao',
    label:    'PUBLICAÇÃO',
    width:    '120px',
    sortable: true,
    render:   (val) => (
      <span className="text-[13px] text-slate-500 font-medium">
        {val ? new Date(val).toLocaleDateString('pt-BR') : '—'}
      </span>
    ),
  },
  {
    key:      'competencia',
    label:    'COMPETÊNCIA',
    width:    '220px',
    sortable: true,
    render:   (val) => (
      <span className="text-[13px] text-slate-600 font-bold whitespace-nowrap">
        {val || '—'}
      </span>
    ),
  },
  {
    key:    'status',
    label:  'STATUS',
    width:  '110px',
    render: (val) => <StatusBadge status={val} />,
  },
  {
    key:    'actions',
    label:  'AÇÕES',
    width:  '90px',
    render: (_, row) => (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(row); }}
          className="p-1.5 text-slate-500 hover:text-[#004c99] hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-200"
          title="Editar"
        >
          <Pencil size={16} />
        </button>
        {row.arquivo_url && (
          <a
            href={row.arquivo_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-transparent hover:border-emerald-200"
            title="Visualizar documento"
          >
            <Globe size={16} />
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
  const qc           = useQueryClient();
  const router       = useRouter();
  const { currentMunicipality } = useMunicipalityStore();

  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('Todos');
  const [exercicioFilter, setExercicioFilter] = useState('Todos');
  const [tipoFilter,      setTipoFilter]      = useState('Todos');
  const [sortKey,       setSortKey]       = useState('data_publicacao');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [page,          setPage]          = useState(0);
  const pageSize                          = 20;
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');



  // ── Stats dinâmicos via API (usa supabaseAdmin para furar o RLS) ────────
  const { data: counts } = useQuery({
    queryKey: ['lrf-counts', currentMunicipality?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/lrf/counts', {
        params: { municipio_id: currentMunicipality?.id }
      });
      return data as { total: number; publicado: number; rascunho: number; arquivado: number };
    }
  });

  // ── Query Principal ───────────────────────────────────────────────────
  const { data: result, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['lrf', currentMunicipality?.id, sortKey, sortDir, page, searchQuery, statusFilter, exercicioFilter, tipoFilter],
    queryFn:  async () => {
      const { data } = await axios.get('/api/admin/lrf/fetch', {
        params: {
          municipio_id: currentMunicipality?.id,
          sortKey,
          sortDir,
          page,
          pageSize,
          searchQuery,
          statusFilter,
          exercicioFilter,
          tipoFilter
        }
      });
      return data;
    },
  });

  const itens = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ── Handlers de edição ───────────────────────────────────────────────
  const handleEdit = (row: LRFItem) => {
    router.push(`/lrf/${row.id}/edit`);
  };

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



  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await axios.post('/api/admin/lrf/bulk-status', { ids, status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lrf'] });
      qc.invalidateQueries({ queryKey: ['lrf-counts'] });
      setSelectedIds([]);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const columns = buildColumns(handleEdit, (id) => setConfirmDelete(id));

  return (
    <div className="flex flex-col gap-4">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 leading-tight tracking-tight">
            Gestão Fiscal (LRF)
          </h1>
          <p className="text-slate-500 text-[13px] font-medium">
            Controle de documentos da Lei de Responsabilidade Fiscal para {currentMunicipality?.name || 'o município'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              refetch();
              qc.invalidateQueries({ queryKey: ['lrf-counts'] });
            }}
            disabled={isFetching}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>

          <button 
            onClick={() => router.push('/lrf/new/edit')}
            className="h-9 px-4 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={16} /> Novo Documento
          </button>
        </div>
      </div>

      {/* ── View Toggle & Status Tabs ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-2">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'Todos', label: 'Todos', count: counts?.total },
            { id: 'Publicado', label: 'Publicado', count: counts?.publicado },
            { id: 'Rascunho', label: 'Rascunho', count: counts?.rascunho },
            { id: 'Arquivado', label: 'Arquivado', count: counts?.arquivado },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(0); }}
              className={`pb-2.5 flex items-center gap-2 text-[13px] font-bold transition-all border-b-2 relative -mb-[1px] ${
                statusFilter === tab.id 
                ? 'text-[#004c99] border-[#004c99]' 
                : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-slate-50 ${statusFilter === tab.id ? 'text-[#004c99] bg-blue-50' : 'text-slate-400'}`}>
                {tab.count || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl mb-2">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              viewMode === 'table' 
                ? 'bg-white text-[#004c99] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TableIcon size={14} /> Tabela
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              viewMode === 'cards' 
                ? 'bg-white text-[#004c99] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid size={14} /> Cards
          </button>
        </div>
      </div>

      {/* ── Search & Bulk Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group flex-1 max-w-[320px]">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#004c99]" />
            <input 
              type="text" 
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full h-9 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={exercicioFilter}
              onChange={e => { setExercicioFilter(e.target.value); setPage(0); }}
              className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-600 outline-none focus:border-[#004c99] transition-all cursor-pointer shadow-sm"
            >
              <option value="Todos">Exercício</option>
              {[2026, 2025, 2024, 2023, 2022, 2021].map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>

            <select 
              value={tipoFilter}
              onChange={e => { setTipoFilter(e.target.value); setPage(0); }}
              className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-600 outline-none focus:border-[#004c99] transition-all cursor-pointer shadow-sm"
            >
              <option value="Todos">Referência</option>
              {['LDO', 'LOA', 'PPA', 'RREO', 'RGF', 'CMED', 'PCG', 'PFA'].map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <BulkActionDropdown 
            selectedCount={selectedIds.length}
            actions={[
              { label: 'Publicar Selecionados', icon: Globe, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'publicado' }), color: 'text-emerald-500' },
              { label: 'Mover para Rascunho', icon: Pencil, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'rascunho' }), color: 'text-amber-500' },
              { label: 'Arquivar Selecionados', icon: HardDriveIcon, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'arquivado' }), color: 'text-slate-400' },
              { label: 'SEPARATOR', icon: X, onClick: () => {} },
              { label: 'Excluir Selecionados', icon: Trash2, onClick: () => setConfirmDelete('bulk'), variant: 'danger' }
            ]}
          />
        </div>

        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5 border-l border-slate-200">
          {totalItems} DOCS
        </div>
      </div>

      {/* ── Data View Container ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10 min-h-[400px]">
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8"
            >
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-6 animate-pulse">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                ))
              ) : itens.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-400 font-medium">
                  Nenhum documento encontrado.
                </div>
              ) : (
                itens.map((item) => {
                  const s = item.status?.toLowerCase() || '';
                  const isPublicado = s === 'publicado';
                  const isRascunho  = s === 'rascunho' || !item.status;
                  
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm group relative flex flex-col hover:border-[#004c99] transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#004c99] flex items-center justify-center border border-blue-100">
                          <FileText size={24} />
                        </div>
                        <div className="flex gap-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm ${
                            isPublicado ? 'bg-emerald-500 text-white'
                            : isRascunho ? 'bg-amber-500 text-white'
                            : 'bg-slate-500 text-white'
                          }`}>
                            {isPublicado ? 'Publicado' : isRascunho ? 'Rascunho' : item.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                            {item.tipo || 'LRF'}
                          </span>
                          {item.ano && (
                            <span className="text-[11px] font-bold text-slate-400">
                              Exercício {item.ano}
                            </span>
                          )}
                        </div>
                        <h3 
                          className="text-[14px] font-bold text-slate-800 line-clamp-2 mb-3 cursor-pointer group-hover:text-[#004c99] transition-colors leading-tight"
                          onClick={() => handleEdit(item)}
                        >
                          {item.titulo}
                        </h3>
                        <p className="text-[12px] font-medium text-slate-500 mb-1">
                          <span className="text-slate-400 font-bold uppercase text-[9px] block">Competência</span>
                          {item.competencia || 'Não informada'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                        <span className="text-[11px] font-medium text-slate-400">
                          {item.data_publicacao ? new Date(item.data_publicacao).toLocaleDateString('pt-BR') : '—'}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.arquivo_url && (
                            <a
                              href={item.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Visualizar documento"
                            >
                              <Globe size={15} />
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-[#004c99] hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => {
                            if (selectedIds.includes(item.id)) setSelectedIds(selectedIds.filter(id => id !== item.id));
                            else setSelectedIds([...selectedIds, item.id]);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-[#004c99] focus:ring-[#004c99] cursor-pointer"
                        />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

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


      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
