"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Pencil, Trash2, Check, Globe, ShieldCheck,
  Save, Search, ChevronLeft, ChevronRight, X, AlertCircle, Loader2,
  HardDrive, ListChecks, ChevronDown, RefreshCw, HardDrive as HardDriveIcon,
  LayoutGrid, Table as TableIcon, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMunicipalityStore } from '@/store/municipality';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import { BulkActionDropdown } from '@/components/shared/BulkActionDropdown';
import axios from 'axios';

// ── Tipos ────────────────────────────────────────────────────────────────
interface Noticia {
  id:               string;
  titulo:           string;
  categoria:        string | null;
  data_publicacao:  string | null;
  url_original:     string | null;
  status:           string | null;
  municipio_id:     string;
  imagem_url:       string | null;
}

// ── Colunas da Tabela (V4 Elite Layout) ──────────────────────────────────
const buildColumns = (
  router: ReturnType<typeof useRouter>,
  onDelete: (id: string) => void,
): Column<Noticia>[] => [
  {
    key:    'imagem_url',
    label:  'CAPA',
    width:  '72px',
    render: (val) => (
      <div className="w-12 h-10 relative rounded overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm">
        {val ? (
          <img src={val} alt="Capa" className="w-full h-full object-cover" />
        ) : (
          <Globe size={16} className="text-slate-300" />
        )}
      </div>
    )
  },
  {
    key:      'titulo',
    label:    'TÍTULO / IDENTIFICAÇÃO',
    sortable: true,
    render:   (val, row) => (
      <div className="max-w-[620px]">
        <p
          className="text-[0.85rem] text-slate-800 font-medium hover:text-[#004c99] cursor-pointer"
          onClick={() => router.push(`/noticias/${row.id}/edit`)}
        >
          {val || 'Sem título'}
        </p>
      </div>
    ),
  },
  {
    key:      'data_publicacao',
    label:    'PUBLICAÇÃO',
    width:    '180px',
    sortable: true,
    render:   (val) => (
      <span className="text-[0.85rem] text-slate-500 font-medium">
        {val ? new Date(val).toLocaleDateString('pt-BR') : '—'}
      </span>
    ),
  },
  {
    key:    'status',
    label:  'STATUS',
    width:  '110px',
    render: (val) => {
      const status = val?.toLowerCase() || 'publicado';
      const isPublicado = ['publicado', 'published'].includes(status) || !val;
      const isRascunho  = ['rascunho', 'draft'].includes(status);
      return (
        <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase ${
          isPublicado ? 'bg-[#DCFCE7] text-[#166534]'
          : isRascunho ? 'bg-[#FEF3C7] text-[#92400E]'
          : 'bg-slate-100 text-slate-600'
        }`}>
          {isPublicado ? 'Publicado' : isRascunho ? 'Rascunho' : val}
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
          onClick={(e) => { e.stopPropagation(); router.push(`/noticias/${row.id}/edit`); }}
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

export default function NoticiasPage() {
  const router       = useRouter();
  const qc           = useQueryClient();
  const { currentMunicipality } = useMunicipalityStore();

  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('Todos');
  const [categoriaFilter, setCategoriaFilter] = useState('Todas');
  const [sortKey,       setSortKey]       = useState('data_publicacao');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [page,          setPage]          = useState(0);
  const pageSize                          = 20;
  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // ── Categorias Disponíveis (limitado para não buscar tudo) ───────────
  const { data: categories } = useQuery({
    queryKey: ['noticias-categories', currentMunicipality?.id],
    queryFn: async () => {
      let q = supabase.from('tab_noticias').select('categoria').limit(200);
      if (currentMunicipality?.id) q = q.eq('municipio_id', currentMunicipality.id);
      const { data } = await q;
      const unique = Array.from(new Set(data?.map((i: any) => i.categoria).filter(Boolean)));
      return unique as string[];
    },
    staleTime: 60 * 1000,
  });

  // ── Stats dinâmicos para as abas (1 API call em vez de 4) ─────────────
  const { data: counts } = useQuery({
    queryKey: ['noticias-counts', currentMunicipality?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/noticias/counts', {
        params: { municipio_id: currentMunicipality?.id }
      });
      return data as { total: number; publicado: number; rascunho: number; arquivado: number };
    },
    enabled: !!currentMunicipality?.id,
    staleTime: 30 * 1000,
  });

  // ── Query Principal ───────────────────────────────────────────────────
  const { data: result, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['noticias', currentMunicipality?.id, sortKey, sortDir, page, searchQuery, statusFilter, categoriaFilter],
    queryFn:  async () => {
      let query = supabase
        .from('tab_noticias')
        .select('id, titulo, categoria, data_publicacao, url_original, status, municipio_id, imagem_url', { count: 'exact' });

      if (currentMunicipality?.id) query = query.eq('municipio_id', currentMunicipality.id);
      if (searchQuery) query = query.ilike('titulo', `%${searchQuery}%`);
      if (categoriaFilter !== 'Todas') query = query.eq('categoria', categoriaFilter);

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

  const noticias = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ── Mutations ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await axios.post('/api/admin/delete-items', { ids, modulo: 'noticias' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['noticias'] });
      qc.invalidateQueries({ queryKey: ['noticias-counts'] });
      setSelectedIds([]);
      setConfirmDelete(null);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await supabase.from('tab_noticias').update({ status }).in('id', ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['noticias'] });
      qc.invalidateQueries({ queryKey: ['noticias-counts'] });
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
            Notícias
          </h1>
          <p className="text-slate-500 text-[13px] font-medium">Gerencie as notícias publicadas no portal de {currentMunicipality?.name || 'município'}</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              refetch();
              qc.invalidateQueries({ queryKey: ['noticias-counts'] });
            }}
            disabled={isFetching}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button 
            onClick={() => router.push('/noticias/new/edit')}
            className="h-9 px-4 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100 cursor-pointer"
          >
            <Plus size={16} /> Nova Notícia
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
              placeholder="Buscar em Notícias..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full h-9 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={categoriaFilter}
              onChange={e => { setCategoriaFilter(e.target.value); setPage(0); }}
              className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-600 outline-none focus:border-[#004c99] transition-all cursor-pointer shadow-sm"
            >
              <option value="Todas">Categoria</option>
              {categories?.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
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
          {totalItems} ITENS
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
                data={noticias}
                columns={columns}
                selectedIds={selectedIds}
                onSelectChange={ids => setSelectedIds(ids as string[])}
                loading={isLoading}
                emptyMessage="Nenhuma notícia encontrada para este município."
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
                  <div key={i} className="bg-slate-50 rounded-2xl p-4 animate-pulse">
                    <div className="aspect-video bg-slate-200 rounded-xl mb-4" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                ))
              ) : noticias.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-400 font-medium">
                  Nenhuma notícia encontrada.
                </div>
              ) : (
                noticias.map((item) => {
                  const status = item.status?.toLowerCase() || 'publicado';
                  const isPublicado = ['publicado', 'published'].includes(status) || !item.status;
                  const isRascunho  = ['rascunho', 'draft'].includes(status);
                  
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm group relative flex flex-col hover:border-[#004c99] transition-all"
                    >
                      <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-100 mb-4 border border-slate-100">
                         {item.imagem_url ? (
                           <img src={item.imagem_url} alt={item.titulo} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300">
                             <Globe size={32} />
                           </div>
                         )}
                         <div className="absolute top-2 right-2 flex gap-1">
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
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            {item.categoria || 'Geral'}
                          </span>
                        </div>
                        <h3 
                          className="text-[14px] font-bold text-slate-800 line-clamp-2 mb-3 cursor-pointer group-hover:text-[#004c99] transition-colors leading-snug"
                          onClick={() => router.push(`/noticias/${item.id}/edit`)}
                        >
                          {item.titulo}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                        <span className="text-[11px] font-medium text-slate-400">
                          {item.data_publicacao ? new Date(item.data_publicacao).toLocaleDateString('pt-BR') : '—'}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push(`/noticias/${item.id}/edit`)}
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

      {/* ── Confirm Deletion Modal ─────────────────────────────────────── */}
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
                  : 'Deseja realmente excluir esta notícia permanentemente de nossa base de dados?'}
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
    </div>
  );
}
