"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, RefreshCw, ChevronLeft, ChevronRight,
  Trash2, Globe, Pencil, HardDrive, X, LayoutGrid, Table as TableIcon, FileText, Check
} from 'lucide-react';
import { useMunicipalityStore } from '@/store/municipality';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import { BulkActionDropdown } from '@/components/shared/BulkActionDropdown';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tipos ────────────────────────────────────────────────────────────────
interface PortariaItem {
  id: string;
  municipio_id: string;
  numero: string;
  data_portaria: string | null;
  ano: number | null;
  tipo: string | null;
  agente: string | null;
  cargo: string | null;
  secretaria: string | null;
  detalhamento: string | null;
  arquivo_url: string | null;
  status: string | null;
}

// ── Badge de Status ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  const s = status?.toLowerCase() || 'rascunho';
  const isPublicado = s === 'publicado';
  const isRascunho  = s === 'rascunho';
  const isArquivado = s === 'arquivado';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase ${
      isPublicado ? 'bg-[#DCFCE7] text-[#166534]'
      : isRascunho ? 'bg-[#FEF3C7] text-[#92400E]'
      : isArquivado ? 'bg-slate-100 text-slate-600'
      : 'bg-slate-100 text-slate-600'
    }`}>
      {isPublicado ? 'Publicado' : isArquivado ? 'Arquivado' : 'Rascunho'}
    </span>
  );
}

// ── Colunas ──────────────────────────────────────────────────────────────
const buildColumns = (
  router: any,
  onDelete: (id: string) => void
): Column<PortariaItem>[] => [
  {
    key: 'numero',
    label: 'TIPO / NÚMERO',
    sortable: true,
    render: (val, row) => (
      <div className="flex flex-col gap-1.5 py-1">
        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black border border-slate-200 uppercase tracking-widest w-fit leading-none">
          {row.tipo || 'PORTARIA'}
        </span>
        <span 
          className="text-[13px] text-slate-800 font-bold leading-tight cursor-pointer hover:text-[#004c99] transition-colors"
          onClick={() => router.push(`/portarias/${row.id}/edit`)}
        >
          {val || 'Sem número'}
        </span>
      </div>
    )
  },
  {
    key: 'detalhamento',
    label: 'DETALHAMENTO',
    render: (val) => (
      <div className="max-w-[400px]">
        <p className="text-[12px] text-slate-500 font-medium leading-relaxed line-clamp-2" title={val}>
          {val || '—'}
        </p>
      </div>
    )
  },
  {
    key: 'secretaria',
    label: 'SECRETARIA',
    render: (val) => (
      <div className="max-w-[200px]">
        <span className="text-[12px] text-slate-600 font-medium truncate block" title={val || ''}>
          {val || 'Não informada'}
        </span>
      </div>
    )
  },
  {
    key: 'data_portaria',
    label: 'DATA',
    width: '100px',
    sortable: true,
    render: (val) => (
      <span className="text-[12px] text-slate-500 font-medium whitespace-nowrap">
        {val ? new Date(val).toLocaleDateString('pt-BR') : '—'}
      </span>
    )
  },
  {
    key: 'status',
    label: 'STATUS',
    width: '110px',
    render: (val) => <StatusBadge status={val} />
  },
  {
    key: 'actions',
    label: 'AÇÕES',
    width: '90px',
    render: (_, row) => (
      <div className="flex items-center justify-end gap-1 pr-2">
        <button 
          onClick={(e) => { e.stopPropagation(); router.push(`/portarias/${row.id}/edit`); }}
          className="p-1.5 text-slate-400 hover:text-[#004c99] hover:bg-blue-50 rounded-lg transition-all"
          title="Editar"
        >
          <Pencil size={16} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          title="Excluir"
        >
          <Trash2 size={16} />
        </button>
      </div>
    )
  }
];

export default function PortariasPage() {
  const router = useRouter();
  const { currentMunicipality } = useMunicipalityStore();
  const qc = useQueryClient();

  // Estados de filtro e paginação
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [anoFilter, setAnoFilter] = useState('Todos');
  const [secretariaFilter, setSecretariaFilter] = useState('Todas');
  const [sortKey, setSortKey] = useState('data_portaria');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // ── Stats via API ───────────────────────────────────────────────────
  const { data: counts } = useQuery({
    queryKey: ['portarias-counts', currentMunicipality?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/portarias/counts', {
        params: { municipio_id: currentMunicipality?.id }
      });
      return data as { total: number; publicado: number; rascunho: number; arquivado: number };
    },
    enabled: !!currentMunicipality?.id,
  });

  // ── Anos disponíveis via API ────────────────────────────────────────
  const { data: anos } = useQuery({
    queryKey: ['portarias-anos', currentMunicipality?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/portarias/anos', {
        params: { municipio_id: currentMunicipality?.id }
      });
      return data as number[];
    },
    enabled: !!currentMunicipality?.id,
  });

  // ── Secretarias disponíveis via API ─────────────────────────────────
  const { data: secretarias } = useQuery({
    queryKey: ['portarias-secretarias', currentMunicipality?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/portarias/secretarias', {
        params: { municipio_id: currentMunicipality?.id }
      });
      return data as string[];
    },
    enabled: !!currentMunicipality?.id,
  });

  // ── Query Principal via API ──────────────────────────────────────────
  const { data: result, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['portarias', currentMunicipality?.id, sortKey, sortDir, page, searchQuery, statusFilter, anoFilter, secretariaFilter],
    queryFn: async () => {
      const { data } = await axios.get('/api/portarias', {
        params: {
          municipio_id: currentMunicipality?.id,
          sortKey,
          sortDir,
          page,
          pageSize,
          searchQuery,
          statusFilter,
          anoFilter,
          secretariaFilter
        }
      });
      return data as { data: PortariaItem[]; count: number };
    },
    enabled: !!currentMunicipality?.id,
  });

  const portarias = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ── Mutations ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await axios.post('/api/admin/delete-items', { ids, modulo: 'portarias' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portarias'] });
      qc.invalidateQueries({ queryKey: ['portarias-counts'] });
      setSelectedIds([]);
      setConfirmDelete(null);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await axios.post('/api/portarias/bulk-status', { ids, status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portarias'] });
      qc.invalidateQueries({ queryKey: ['portarias-counts'] });
      setSelectedIds([]);
    },
  });

  const columns = buildColumns(router, (id) => setConfirmDelete(id));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 leading-tight">Portarias</h1>
          <p className="text-slate-500 text-[13px] font-medium">Gestão de atos administrativos e nomeações</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button 
            onClick={() => router.push('/portarias/new')}
            className="h-9 px-4 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={16} /> Nova Portaria
          </button>
        </div>
      </div>

      {/* Tabs & View Mode Toggle */}
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
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.id ? 'text-[#004c99] bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
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

      {/* Filters & Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group flex-1 max-w-[320px]">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar em qualquer coluna..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full h-9 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[13px] font-medium focus:border-[#004c99] outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={secretariaFilter}
              onChange={e => { setSecretariaFilter(e.target.value); setPage(0); }}
              className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-600 outline-none focus:border-[#004c99] transition-all cursor-pointer shadow-sm max-w-[400px] truncate"
            >
              <option value="Todas">Secretaria</option>
              {secretarias?.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            <select 
              value={anoFilter}
              onChange={e => { setAnoFilter(e.target.value); setPage(0); }}
              className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-600 outline-none focus:border-[#004c99] transition-all cursor-pointer shadow-sm"
            >
              <option value="Todos">Ano</option>
              {anos?.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          <BulkActionDropdown 
            selectedCount={selectedIds.length}
            actions={[
              { label: 'Publicar Selecionados', icon: Globe, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'publicado' }), color: 'text-emerald-500' },
              { label: 'Mover para Rascunho', icon: Pencil, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'rascunho' }), color: 'text-amber-500' },
              { label: 'Arquivar Selecionados', icon: HardDrive, onClick: () => bulkStatusMutation.mutate({ ids: selectedIds, status: 'arquivado' }), color: 'text-slate-400' },
              { label: 'SEPARATOR', icon: X, onClick: () => {} },
              { label: 'Excluir Selecionados', icon: Trash2, onClick: () => setConfirmDelete('bulk'), variant: 'danger' }
            ]}
          />
        </div>

        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5 border-l border-slate-200">
          {totalItems} ITENS
        </div>
      </div>

      {/* Data View Container */}
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
                data={portarias}
                columns={columns}
                selectedIds={selectedIds}
                onSelectChange={ids => setSelectedIds(ids as string[])}
                loading={isLoading}
                emptyMessage="Nenhuma portaria encontrada."
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={(key) => {
                  if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortKey(key); setSortDir('asc'); }
                }}
                onRowClick={(row) => router.push(`/portarias/${row.id}/edit`)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-8 bg-slate-50/30"
            >
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse shadow-sm">
                    <div className="flex gap-4 mb-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                        <div className="h-6 bg-slate-200 rounded w-2/3" />
                      </div>
                    </div>
                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                      <div className="h-4 bg-slate-200 rounded w-5/6" />
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                ))
              ) : portarias.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-400 font-medium flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <FileText size={24} />
                  </div>
                  Nenhuma portaria encontrada.
                </div>
              ) : (
                portarias.map((item) => {
                  const status = item.status?.toLowerCase() || 'rascunho';
                  const isPublicado = status === 'publicado';
                  const isRascunho  = status === 'rascunho';
                  const isArquivado = status === 'arquivado';
                  
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}
                      className={`bg-white rounded-2xl border transition-all relative group flex flex-col ${
                        selectedIds.includes(item.id) 
                          ? 'border-[#004c99] shadow-md shadow-blue-100 ring-1 ring-[#004c99]' 
                          : 'border-slate-200 shadow-sm hover:border-slate-300'
                      }`}
                    >
                      {/* Card Header: Icon & Metadata */}
                      <div className="p-5 pb-4">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#004c99] flex items-center justify-center border border-blue-100 flex-shrink-0">
                              <FileText size={22} strokeWidth={1.5} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black border border-slate-200 uppercase tracking-widest leading-none">
                                  {item.tipo || 'PORTARIA'}
                                </span>
                              </div>
                              <h3 
                                className="text-[15px] font-black text-slate-800 leading-tight cursor-pointer group-hover:text-[#004c99] transition-colors"
                                onClick={() => router.push(`/portarias/${item.id}/edit`)}
                              >
                                {item.numero || 'Sem identificação'}
                              </h3>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm ${
                                isPublicado ? 'bg-emerald-500 text-white'
                                : isRascunho ? 'bg-amber-500 text-white'
                                : 'bg-slate-500 text-white'
                              }`}>
                                {isPublicado ? 'Publicado' : isRascunho ? 'Rascunho' : item.status}
                              </span>
                          </div>
                        </div>

                        {/* Card Body: Detalhamento Preview */}
                        <div className="mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[12px] text-slate-600 font-medium leading-relaxed line-clamp-3 italic">
                            {item.detalhamento || 'Nenhuma descrição fornecida.'}
                          </p>
                        </div>
                        
                        {/* Tags / Info */}
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {item.data_portaria && (
                            <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                              {new Date(item.data_portaria).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                          {item.secretaria && (
                            <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1.5 max-w-[200px] truncate">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                              <span className="truncate">{item.secretaria}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Actions */}
                      <div className="mt-auto px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group/chk">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            selectedIds.includes(item.id) 
                              ? 'bg-[#004c99] border-[#004c99] text-white' 
                              : 'bg-white border-slate-300 text-transparent group-hover/chk:border-[#004c99]'
                          }`}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 select-none">Selecionar</span>
                          {/* Oculto, mas funciona p/ state */}
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => {
                              if (selectedIds.includes(item.id)) setSelectedIds(selectedIds.filter(id => id !== item.id));
                              else setSelectedIds([...selectedIds, item.id]);
                            }}
                            className="hidden"
                          />
                        </label>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/portarias/${item.id}/edit`); }}
                            className="px-3 py-1.5 text-[11px] font-bold text-[#004c99] hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1.5"
                          >
                            <Pencil size={13} /> Editar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(item.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
              Página {page + 1} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                Deseja realmente excluir {confirmDelete === 'bulk' ? `estas ${selectedIds.length} portarias` : 'esta portaria'} permanentemente? Esta ação removerá também o arquivo do Storage.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600">Cancelar</button>
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
    </div>
  );
}
