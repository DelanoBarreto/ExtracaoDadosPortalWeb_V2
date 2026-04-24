"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Globe, Calendar, ChevronLeft, ChevronRight,
  Trash2, Pencil, CheckCircle2, ListChecks, ChevronDown, HardDrive, X, Terminal
} from 'lucide-react';
import { usePortalStore } from '@/store/usePortalStore';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import axios from 'axios';
import { motion } from 'framer-motion';

// ── Tipos ────────────────────────────────────────────────────────────────
interface Noticia {
  id:               string;
  titulo:           string;
  data_publicacao:  string | null;
  url_original:     string | null;
  status:           string | null;
  municipio_id:     string;
}

// ── Colunas da Tabela ────────────────────────────────────────────────────
const buildColumns = (
  router: ReturnType<typeof useRouter>,
  onDelete: (id: string) => void,
): Column<Noticia>[] => [
  {
    key:      'titulo',
    label:    'Título da Notícia / Ato',
    sortable: true,
    render:   (val, row) => (
      <div>
        <p style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: 2, lineHeight: 1.4 }}>{val}</p>
        {row.url_original && (
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Globe size={11} />Portal Oficial
          </p>
        )}
      </div>
    ),
  },
  {
    key:      'data_publicacao',
    label:    'Data',
    width:    '160px',
    sortable: true,
    render:   (val) => val ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.8125rem' }}>
        <Calendar size={13} />
        {new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    ) : <span style={{ color: '#94a3b8' }}>—</span>,
  },
  {
    key:    'status',
    label:  'Status',
    width:  '120px',
    render: (val) => {
      const statusMap: Record<string, { label: string; bg: string; text: string }> = {
        publicado: { label: 'Publicado', bg: '#dcfce7', text: '#166534' },
        rascunho:  { label: 'Rascunho', bg: '#f1f5f9', text: '#64748b' },
        arquivado: { label: 'Arquivado', bg: '#fee2e2', text: '#991b1b' },
      };
      // Tratamento para status em inglês salvos acidentalmente
      const key = val === 'published' ? 'publicado' : val === 'draft' ? 'rascunho' : val === 'archived' ? 'arquivado' : (val || 'rascunho');
      const s = statusMap[key] ?? statusMap['rascunho'];
      return (
        <span style={{ 
          background: s.bg, color: s.text, padding: '4px 10px', 
          borderRadius: '6px', fontSize: '11px', fontWeight: 700, 
          textTransform: 'uppercase', letterSpacing: '0.5px' 
        }}>
          {s.label}
        </span>
      );
    },
  },
  {
    key:    'id',
    label:  'Operações',
    width:  '120px',
    render: (val) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/noticias/${val}/edit`); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, border: '1px solid #e2e8f0',
            borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b',
          }}
          title="Editar"
        >
          <Pencil size={14} />
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

// ── Página ────────────────────────────────────────────────────────────────
export default function NoticiasPage() {
  const router       = useRouter();
  const qc           = useQueryClient();
  const { municipioAtivo, setLogPanelOpen } = usePortalStore();

  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('Todos');
  const [sortKey,       setSortKey]       = useState('data_publicacao');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [page,          setPage]          = useState(0);
  const [pageSize]                        = useState(20);
  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);

  // ── Sincronização Realtime ───────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tab_noticias' },
        () => {
          qc.invalidateQueries({ queryKey: ['noticias'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // ── Query com Paginação ──────────────────────────────────────────────
  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['noticias', municipioAtivo?.id, sortKey, sortDir, page, pageSize, searchQuery, statusFilter],
    queryFn:  async () => {
      let query = supabase
        .from('tab_noticias')
        .select('id, titulo, data_publicacao, url_original, status, municipio_id', { count: 'exact' });

      if (municipioAtivo?.id) {
        query = query.eq('municipio_id', municipioAtivo.id);
      }

      if (searchQuery) {
        query = query.ilike('titulo', `%${searchQuery}%`);
      }

      if (statusFilter !== 'Todos') {
        // Handle mapped status
        let sf = statusFilter.toLowerCase();
        if (sf === 'publicado') query = query.in('status', ['publicado', 'published']);
        else if (sf === 'rascunho') query = query.in('status', ['rascunho', 'draft', null]);
        else if (sf === 'arquivado') query = query.in('status', ['arquivado', 'archived']);
        else query = query.eq('status', sf);
      }

      const { data, error, count } = await query
        .order(sortKey as any, { ascending: sortDir === 'asc' })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const noticias = result?.data ?? [];
  const filtered = noticias;
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // ── Stats globais do painel
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', municipioAtivo?.id],
    queryFn: async () => {
      let query = supabase.from('tab_noticias').select('*', { count: 'exact', head: true });
      if (municipioAtivo?.id) query = query.eq('municipio_id', municipioAtivo.id);
      const res = await query;
      return { noticias: res.count ?? 0 };
    }
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await axios.post('/api/admin/delete-items', { ids, modulo: 'noticias' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['noticias'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      setSelectedIds([]);
      setDropdownBulkOpen(false);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = (id: string) => setConfirmDelete(id);
  const handleBulkDelete = () => {
    setDropdownBulkOpen(false);
    setConfirmDelete('bulk');
  };

  const confirmDeletion = () => {
    const ids = confirmDelete === 'bulk' ? selectedIds : [confirmDelete!];
    deleteMutation.mutate(ids);
  };

  const columns = buildColumns(router, handleDelete);

  const currentCount = stats?.noticias || 0;
  const storageMB = (currentCount * 0.2).toFixed(1);

  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* ── Main Header ────────────────────────────────────────────── */}
      <header className="px-8 pt-6 pb-2 bg-white flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px]">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-city-hall-blue tracking-tight flex items-center gap-2">
            {municipioAtivo ? municipioAtivo.nome : 'Painel de Controle Nacional'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-extrabold text-[#166534] flex items-center gap-1.5 px-2 py-0.5 bg-[#ecfdf5] rounded-full border border-emerald-200">
              <div className="w-1.5 h-1.5 rounded-full bg-[#166534] animate-pulse" /> LIVE SYNC
            </span>
            <span className="text-[12px] text-slate-500 font-medium">
              {municipioAtivo ? (municipioAtivo.url_base || 'Portal Oficial') : `Gerenciando ${currentCount} registros globais`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registros</span>
            <span className="font-mono text-2xl font-extrabold text-[#0f172a]">{currentCount}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Storage</span>
            <span className="font-mono text-2xl font-extrabold text-[#0f172a]">{storageMB}<small className="text-[12px] text-slate-500 ml-1">MB</small></span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <button 
            onClick={() => router.push('/noticias/new/edit')}
            className="h-10 px-4 bg-city-hall-accent text-white hover:bg-city-hall-blue rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <Plus size={16} /> Novo
          </button>
        </div>
      </header>

      {/* ── Status Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-6 border-b border-slate-200 mb-6 px-1">
        {['Todos', 'Publicado', 'Rascunho', 'Arquivado'].map(st => (
          <button 
            key={st} 
            className={`pb-3 text-[14px] font-medium transition-all border-b-2 ${
              statusFilter === st 
                ? 'text-city-hall-accent border-city-hall-accent font-bold' 
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`} 
            onClick={() => { setStatusFilter(st); setPage(0); }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* ── Action Toolbar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-5 pb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex items-center w-[320px]">
            <Search size={15} className="absolute left-3 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-[13px] outline-none focus:border-blue-500 transition-colors"
              placeholder="Buscar em Notícias..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          
          <button 
            onClick={() => router.push('/scraper?module=noticias')} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md text-[13px] font-semibold hover:bg-slate-900 transition-colors"
          >
            <Terminal size={15} />
            Ir para o Console de Raspagem
          </button>

          <div className="relative">
            <button 
              className={`flex items-center gap-2 px-4 py-2 border rounded-md text-[12px] font-semibold transition-colors ${
                selectedIds.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-600'
              }`}
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert('Selecione um ou mais registros na tabela para realizar ações em lote.');
                  return;
                }
                setDropdownBulkOpen(!dropdownBulkOpen);
              }}
            >
              <ListChecks size={15} /> Ações em Lote {selectedIds.length > 0 && `(${selectedIds.length})`}
              <ChevronDown size={14} />
            </button>
            {dropdownBulkOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-[220px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-2">
                <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Mudar Status</div>
                <button className="w-full px-4 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2" onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'publicado' })}>
                  <CheckCircle2 size={14} className="text-emerald-500" /> Publicar Selecionados
                </button>
                <button className="w-full px-4 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2" onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'rascunho' })}>
                  <Pencil size={14} className="text-amber-500" /> Mover para Rascunho
                </button>
                <button className="w-full px-4 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2" onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'arquivado' })}>
                  <HardDrive size={14} className="text-slate-500" /> Arquivar Selecionados
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button className="w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={handleBulkDelete}>
                  <Trash2 size={14} /> Excluir Selecionados
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Container da Tabela ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border-color shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden flex-1 flex flex-col mb-4">
        <DataTableV2
          data={filtered}
          columns={columns}
          selectedIds={selectedIds}
          onSelectChange={ids => setSelectedIds(ids as string[])}
          loading={isLoading}
          emptyMessage="Sem itens para exibir. Use o filtro acima ou colete dados novos."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />

        {/* ── Paginação ────────────────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 mt-auto">
            <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Página {page + 1} de {totalPages} — Mostrando {noticias.length} de {totalItems} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-100 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

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
                ? `Você está prestes a remover permanentemente ${selectedIds.length} registros. Esta ação é irreversível e afetará a transparência pública.`
                : 'Este registro será removido permanentemente de nossa base de dados. Confirma esta operação?'}
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

