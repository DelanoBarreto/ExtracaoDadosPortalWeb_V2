"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Globe, Trash2, Pencil, ListChecks, ChevronDown, 
  HardDrive, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useMunicipalityStore } from '@/store/municipality';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

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
    label:    'TÍTULO',
    sortable: true,
    render:   (val, row) => (
      <p
        className="text-[0.85rem] text-slate-800 font-medium hover:text-[#004c99] cursor-pointer"
        onClick={() => router.push(`/noticias/${row.id}/edit`)}
      >
        {val || 'Sem título'}
      </p>
    ),
  },
  {
    key:    'categoria',
    label:  'CATEGORIA',
    width:  '140px',
    render: (val) => (
      <span className="text-[0.85rem] text-slate-500">{val || '—'}</span>
    )
  },
  {
    key:      'data_publicacao',
    label:    'DATA',
    width:    '120px',
    sortable: true,
    render:   (val) => (
      <span className="text-[0.85rem] text-slate-500">
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
  const [sortKey,       setSortKey]       = useState('data_publicacao');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [page,          setPage]          = useState(0);
  const pageSize                          = 20;
  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);

  // ── Stats dinâmicos para as abas ─────────────────────────────────────
  const { data: counts } = useQuery({
    queryKey: ['noticias-counts', currentMunicipality?.id],
    queryFn: async () => {
      const getCount = async (status?: string) => {
        let q = supabase.from('tab_noticias').select('*', { count: 'exact', head: true });
        if (currentMunicipality?.id) q = q.eq('municipio_id', currentMunicipality.id);
        if (status === 'rascunho') q = q.in('status', ['rascunho', 'draft', null]);
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
    queryKey: ['noticias', currentMunicipality?.id, sortKey, sortDir, page, searchQuery, statusFilter],
    queryFn:  async () => {
      let query = supabase
        .from('tab_noticias')
        .select('id, titulo, data_publicacao, url_original, status, municipio_id, imagem_url', { count: 'exact' });

      if (currentMunicipality?.id) query = query.eq('municipio_id', currentMunicipality.id);
      if (searchQuery) query = query.ilike('titulo', `%${searchQuery}%`);

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
    <div className="flex flex-col gap-8">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-black text-slate-900 leading-tight tracking-tight">
            Notícias
          </h1>
          <p className="text-slate-500 text-[14px] font-medium mt-1">Gerencie as notícias publicadas no portal de {currentMunicipality?.name || 'município'}</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/noticias/new/edit')}
            className="h-10 px-5 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={18} /> Nova Notícia
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
              placeholder="Buscar em Notícias..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="w-full h-11 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setDropdownBulkOpen(!dropdownBulkOpen)}
              className="h-11 px-5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <ListChecks size={18} /> Ações em Lote <ChevronDown size={16} />
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
                    <Globe size={16} className="text-emerald-500" /> Publicar Selecionados
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
          {totalItems} ITENS
        </div>
      </div>

      {/* ── Data Table Container ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
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
