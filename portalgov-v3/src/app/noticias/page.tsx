"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Zap, Search, Globe, ChevronRight, FileText,
  Trash2, RefreshCw, Pencil, CheckCircle2, XCircle, Terminal
} from 'lucide-react';
import { usePortalStore } from '@/store/usePortalStore';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { useEffect } from 'react';

// ── Tipos ────────────────────────────────────────────────────────────────
interface Noticia {
  id:               string;
  titulo:           string;
  data_publicacao:  string | null;
  origem:           string | null;
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
        {row.origem && (
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Globe size={11} />{row.origem}
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
      const map: Record<string, { label: string; cls: string }> = {
        published: { label: 'Publicado', cls: 'badge badge-published' },
        draft:     { label: 'Rascunho', cls: 'badge badge-draft' },
        archived:  { label: 'Arquivado', cls: 'badge badge-archived' },
      };
      const s = map[val] ?? { label: val ?? 'Rascunho', cls: 'badge badge-draft' };
      return <span className={s.cls}>{s.label}</span>;
    },
  },
  {
    key:    'id',
    label:  'Ações',
    width:  '120px',
    render: (val) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/noticias/${val}/edit`); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, border: '1px solid #e2e8f0',
            borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b',
            transition: 'border-color 0.15s, color 0.15s'
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
            transition: 'background 0.15s'
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
  const [sortKey,       setSortKey]       = useState('data_publicacao');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [page,          setPage]          = useState(0);
  const [pageSize]                        = useState(20);
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);

  // ── Sincronização Realtime ───────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tab_noticias' },
        () => {
          console.log('🔄 Mudança detectada em tab_noticias, atualizando...');
          qc.invalidateQueries({ queryKey: ['tab_noticias'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // ── Query com Paginação ──────────────────────────────────────────────
  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['noticias', municipioAtivo?.id, sortKey, sortDir, page, pageSize, searchQuery],
    queryFn:  async () => {
      if (!municipioAtivo?.id) return { data: [], count: 0 };
      
      let query = supabase
        .from('tab_noticias')
        .select('id, titulo, data_publicacao, origem, status, municipio_id', { count: 'exact' })
        .eq('municipio_id', municipioAtivo.id);

      if (searchQuery) {
        query = query.ilike('titulo', `%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order(sortKey as any, { ascending: sortDir === 'asc' })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!municipioAtivo?.id,
  });

  const noticias = result?.data ?? [];
  const totalItems = result?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // O filtro agora é feito no servidor via searchQuery
  const filtered = noticias;

  // ── Mutations ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('tab_noticias').delete().in('id', ids);
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
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = (id: string) => setConfirmDelete(id);
  const handleBulkDelete = () => setConfirmDelete('bulk');

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
            <Zap size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="label-caps !text-[10px]">Portal Transparência</span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="label-caps !text-[10px] !text-[var(--color-primary)]">Gestão de Conteúdo</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--color-ink)]">
              Notícias & Atos Oficiais
            </h1>
            <p className="text-sm font-bold text-[var(--color-muted)] mt-1">
              {municipioAtivo?.nome} — {isLoading ? 'Sincronizando...' : `${totalItems} registros coletados`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => refetch()}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-[var(--color-border-soft)] text-[var(--color-ink-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all shadow-sm"
            title="Sincronizar Dados"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => router.push('/noticias/new/edit')}
            className="px-6 py-3.5 bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[var(--color-primary-glow)] transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Registro
          </button>
          <button 
            onClick={() => setLogPanelOpen(true)}
            className="px-8 py-3.5 bg-[var(--color-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2 active:scale-95"
          >
            <Terminal size={18} />
            Painel de Raspagem
          </button>
        </div>
      </header>

      {/* ── Filtros & Busca ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
          <input
            className="w-full h-14 pl-14 pr-6 bg-white border-2 border-slate-50 rounded-2xl text-sm font-bold text-[var(--color-ink)] placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-glow)] outline-none transition-all shadow-sm"
            placeholder="Pesquisar por título, palavra-chave ou origem da extração..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(0); // Resetar página ao buscar
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 text-[var(--color-muted)]">
            <Globe size={16} />
            <span className="text-xs font-black uppercase tracking-wider">Filtro Ativo: Todos</span>
          </div>
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
          emptyMessage="Nenhuma notícia encontrada. Inicie o motor de coleta para importar dados."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />

        {/* ── Paginação ────────────────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-6 border-t border-[var(--color-border-soft)] bg-slate-50/50">
            <div className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">
              Página {page + 1} de {totalPages} — Mostrando {noticias.length} de {totalItems} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Barra de Ações em Lote ─────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          count={selectedIds.length}
          loading={bulkStatusMutation.isPending || deleteMutation.isPending}
          onPublish={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'published' })}
          onArchive={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'archived' })}
          onDelete={handleBulkDelete}
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
