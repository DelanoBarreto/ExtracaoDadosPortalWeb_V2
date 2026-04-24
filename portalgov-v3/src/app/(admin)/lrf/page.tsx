"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Download, Terminal, 
  Calendar, ShieldCheck, Pencil, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, CheckCircle2, ChevronDown, ListChecks, HardDrive, X
} from 'lucide-react';
import { usePortalStore } from '@/store/usePortalStore';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import axios from 'axios';

// ── Tipos ─────────────────────────────────────────────────────────────────
interface LRFItem {
  id:               string;
  titulo:           string;
  data_publicacao:  string | null;
  arquivo_url:      string | null;
  municipio_id:     string;
  tipo:             string | null;
  status:           string | null;
}

// ── Colunas ───────────────────────────────────────────────────────────────
const buildColumns = (
  router: ReturnType<typeof useRouter>,
  onDelete: (id: string) => void,
): Column<LRFItem>[] => [
  {
    key:      'titulo',
    label:    'Documento / Categoria',
    sortable: true,
    render:   (val, row) => (
      <div className="flex flex-col py-1">
        <span className="text-[13px] font-semibold text-slate-900 leading-snug">{val}</span>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
          <ShieldCheck size={11} />
          {row.tipo ?? 'Lei de Responsabilidade Fiscal'}
        </div>
      </div>
    ),
  },
  {
    key:      'data_publicacao',
    label:    'Data Referência',
    width:    '160px',
    sortable: true,
    render:   (val) => val ? (
      <div className="flex items-center gap-2 text-[12px] text-slate-500 font-medium">
        <Calendar size={13} className="text-slate-400" />
        {new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    ) : <span className="text-slate-300">—</span>,
  },
  {
    key:    'status',
    label:  'Status',
    width:  '120px',
    render: (val) => {
      const status = val?.toLowerCase() || 'rascunho';
      if (status === 'publicado' || status === 'published') 
        return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase border border-emerald-100">Publicado</span>;
      if (status === 'arquivado' || status === 'archived') 
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase border border-slate-200">Arquivado</span>;
      return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold uppercase border border-amber-100">Rascunho</span>;
    },
  },
  {
    key:    'arquivo_url',
    label:  'Doc',
    width:  '60px',
    render: (val) => val ? (
      <a
        href={val}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-colors"
        title="Baixar documento"
      >
        <Download size={14} />
      </a>
    ) : <span className="text-slate-300 text-[10px]">—</span>,
  },
  {
    key:    'actions',
    label:  '',
    width:  '100px',
    render: (_, row) => (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/lrf/${row.id}/edit`); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>
    ),
  },
];

export default function LRFPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { municipioAtivo, setLogPanelOpen } = usePortalStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortKey, setSortKey] = useState('data_publicacao');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;
  
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteStorage, setDeleteStorage] = useState(false);
  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);

  // ── Realtime Sync ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('lrf-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_lrf' }, () => {
        qc.invalidateQueries({ queryKey: ['lrf'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // ── Data Query ──────────────────────────────────────────────────────
  const { data: result, isLoading } = useQuery({
    queryKey: ['lrf', municipioAtivo?.id, sortKey, sortDir, page, pageSize, searchQuery, statusFilter],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/lrf/fetch', {
        params: {
          municipio_id: municipioAtivo?.id,
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

  // Stats for the header
  const { data: stats } = useQuery({
    queryKey: ['lrf-stats', municipioAtivo?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/lrf/fetch', {
        params: {
          municipio_id: municipioAtivo?.id,
          pageSize: 1
        }
      });
      return { count: data.count ?? 0 };
    }
  });

  // ── Mutations ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await axios.post('/api/admin/delete-items', { ids, modulo: 'lrf' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lrf'] });
      setSelectedIds([]);
      setConfirmDelete(null);
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      if (!municipioAtivo?.id) return;
      await axios.delete('/api/admin/clear-data', {
        params: { municipio_id: municipioAtivo.id, modulo: 'lrf', delete_storage: deleteStorage }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lrf'] });
      setConfirmClear(false);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await supabase.from('tab_lrf').update({ status }).in('id', ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lrf'] });
      setSelectedIds([]);
      setDropdownBulkOpen(false);
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };


  const columns = buildColumns(router, (id) => setConfirmDelete(id));

  const actionsEnabled = !!municipioAtivo;
  const currentCount = stats?.count || 0;

  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* ── Main Header ────────────────────────────────────────────── */}
      <header className="px-8 pt-6 pb-2 bg-white flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px]">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-city-hall-blue tracking-tight flex items-center gap-2">
            {municipioAtivo ? `LRF: ${municipioAtivo.nome}` : 'Transparência Fiscal Nacional'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-extrabold text-[#166534] flex items-center gap-1.5 px-2 py-0.5 bg-[#ecfdf5] rounded-full border border-emerald-200">
              <div className="w-1.5 h-1.5 rounded-full bg-[#166534] animate-pulse" /> LIVE SYNC
            </span>
            <span className="text-[12px] text-slate-500 font-medium">
              Gestão de Documentos da Lei de Responsabilidade Fiscal
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Arquivos</span>
            <span className="font-mono text-2xl font-extrabold text-[#0f172a]">{currentCount}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <button 
            onClick={() => router.push('/lrf/new/edit')}
            className="h-10 px-4 bg-city-hall-accent text-white hover:bg-city-hall-blue rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <Plus size={16} /> Novo Documento
          </button>
          <button 
            onClick={() => setLogPanelOpen(true)}
            className="h-10 px-4 bg-white border border-border-color text-text-primary rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <Terminal size={16} /> Painel
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
              placeholder="Buscar documentos LRF..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            />
          </div>
          
          <button 
            onClick={() => router.push('/scraper?module=lrf')} 
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
                if (selectedIds.length === 0) return;
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
                <button className="w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={() => setConfirmDelete('bulk')}>
                  <Trash2 size={14} /> Excluir Selecionados
                </button>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setConfirmClear(true)} 
          disabled={!actionsEnabled}
          className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md text-[13px] font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <Trash2 size={15} /> Limpar Módulo
        </button>
      </div>

      {/* ── Container da Tabela ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col mb-4">
        <DataTableV2
          data={itens}
          columns={columns}
          selectedIds={selectedIds}
          onSelectChange={ids => setSelectedIds(ids as string[])}
          loading={isLoading}
          emptyMessage="Nenhum documento fiscal encontrado."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />

        {/* ── Paginação ────────────────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 mt-auto">
            <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Página {page + 1} de {totalPages} — Mostrando {itens.length} de {totalItems} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modais de Confirmação ──────────────────────────────────────── */}
      {confirmClear && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Limpar Módulo LRF</h3>
            <p className="text-slate-500 text-sm mb-6">
              Esta ação apagará todos os documentos fiscais do município <strong>{municipioAtivo?.nome}</strong>.
            </p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-6 cursor-pointer" onClick={() => setDeleteStorage(!deleteStorage)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${deleteStorage ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                {deleteStorage && <CheckCircle2 size={12} />}
              </div>
              <span className="text-xs font-bold text-slate-600">Apagar também arquivos PDF do Storage</span>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors" onClick={() => setConfirmClear(false)}>Cancelar</button>
              <button className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors" onClick={() => { clearDataMutation.mutate(); }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Registro</h3>
            <p className="text-slate-500 text-sm mb-6">
              {confirmDelete === 'bulk' ? `Deseja excluir permanentemente ${selectedIds.length} registros?` : 'Deseja excluir permanentemente este documento fiscal?'}
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors" onClick={() => {
                const ids = confirmDelete === 'bulk' ? selectedIds : [confirmDelete as string];
                deleteMutation.mutate(ids);
              }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
