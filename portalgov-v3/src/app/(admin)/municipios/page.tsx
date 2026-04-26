"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, MapPin, Globe,
  Settings, Trash2, Building2, ChevronDown, ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { DataTableV2, Column } from '@/components/shared/DataTableV2';

// ── Tipos ────────────────────────────────────────────────────────────────
interface Municipio {
  id:           string;
  nome:         string;
  slug:         string;
  cor_primaria: string | null;
  status:       string | null;
}

// ── Colunas da Tabela (V4 Elite) ──────────────────────────────────────────
const buildColumns = (
  router: ReturnType<typeof useRouter>,
  onDelete: (id: string) => void,
): Column<Municipio>[] => [
  {
    key:      'nome',
    label:    'CIDADE / MUNICÍPIO',
    sortable: true,
    render:   (val, row) => (
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#004c99] group-hover:border-blue-100 transition-all">
          <MapPin size={18} />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-[14px] leading-tight">{val}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">/{row.slug}</p>
        </div>
      </div>
    ),
  },
  {
    key:      'visual',
    label:    'IDENTIDADE VISUAL',
    width:    '200px',
    render:   (_, row) => (
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full border-2 border-white shadow-md"
          style={{ background: row.cor_primaria || '#004c99' }}
        />
        <span className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-tighter">
          {row.cor_primaria || '#004C99'}
        </span>
      </div>
    ),
  },
  {
    key:    'status',
    label:  'STATUS',
    width:  '140px',
    render: (val) => {
      const isActive = val === 'ativo';
      return (
        <span className={`text-[11px] font-black uppercase tracking-wider ${
          isActive ? 'text-emerald-600' : 'text-slate-400'
        }`}>
          {isActive ? 'ATIVO' : 'INATIVO'}
        </span>
      );
    },
  },
  {
    key:    'actions',
    label:  'AÇÕES',
    width:  '120px',
    render: (_, row) => (
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/municipios/${row.id}/edit`); }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Configurações"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
          className="text-slate-300 hover:text-red-500 transition-colors"
          title="Excluir"
        >
          <Trash2 size={18} />
        </button>
      </div>
    ),
  },
];

export default function MunicipiosPage() {
  const router       = useRouter();
  const qc           = useQueryClient();

  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [sortKey,       setSortKey]       = useState('nome');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null);
  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);

  // ── Query ────────────────────────────────────────────────────────────────
  const { data: municipios = [], isLoading } = useQuery<Municipio[]>({
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
      setDropdownBulkOpen(false);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const columns = buildColumns(router, (id) => setConfirmDelete(id));

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      
      {/* ── Top Navigation Bar (Layout Elite) ─────────────────────────── */}
      <nav className="h-14 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-40 mx-[-32px] mt-[-32px] mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">
            <Globe size={16} />
          </div>
          <span className="text-[13px] font-bold text-slate-900">Infraestrutura Global</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            Status: <span className="text-emerald-600 font-black">OPERACIONAL</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#004c99] text-white flex items-center justify-center text-[11px] font-bold shadow-lg shadow-blue-100">
            AD
          </div>
        </div>
      </nav>

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[26px] font-black text-slate-900 leading-tight tracking-tight">
            Municípios & Portais
          </h1>
          <p className="text-slate-500 text-[14px] font-medium mt-1">
            Gestão da rede de portais da transparência municipal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/municipios/new/edit')}
            className="h-10 px-5 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={18} /> Novo Município
          </button>
        </div>
      </div>

      {/* ── Search & Bulk Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative group flex-1 max-w-[320px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#004c99]" />
            <input 
              type="text" 
              placeholder="Buscar cidades..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setDropdownBulkOpen(!dropdownBulkOpen)}
              className={`h-10 px-5 border rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm ${
                selectedIds.length > 0 
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
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
                  <button 
                    disabled={selectedIds.length === 0}
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'ativo' })} 
                    className={`w-full px-4 py-2.5 text-left text-[13px] font-bold text-slate-700 flex items-center gap-3 ${selectedIds.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                  >
                    <Building2 size={16} className="text-emerald-500" /> Ativar Selecionados
                  </button>
                  <button 
                    disabled={selectedIds.length === 0}
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'inativo' })} 
                    className={`w-full px-4 py-2.5 text-left text-[13px] font-bold text-slate-700 flex items-center gap-3 ${selectedIds.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                  >
                    <Plus size={16} className="text-slate-400 rotate-45" /> Desativar Selecionados
                  </button>
                  <div className="h-px bg-slate-100 my-1 mx-2" />
                  <button 
                    disabled={selectedIds.length === 0}
                    onClick={() => setConfirmDelete('bulk')} 
                    className={`w-full px-4 py-2.5 text-left text-[13px] font-bold text-red-500 flex items-center gap-3 ${selectedIds.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-50'}`}
                  >
                    <Trash2 size={16} /> Remover permanentemente
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 border-l border-slate-200">
          {filtered.length} ITENS
        </div>
      </div>

      {/* ── Data Table Container ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
        <DataTableV2
          data={filtered}
          columns={columns}
          selectedIds={selectedIds}
          onSelectChange={ids => setSelectedIds(ids as string[])}
          loading={isLoading}
          emptyMessage="Nenhum município cadastrado no sistema."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────────── */}
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
              <h3 className="text-2xl font-black text-slate-900 mb-2">Confirmar Remoção</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                {confirmDelete === 'bulk' 
                  ? `Você está prestes a remover permanentemente ${selectedIds.length} municípios. Todos os dados vinculados serão perdidos.` 
                  : 'Esta instância de município e todos os seus dados vinculados serão removidos permanentemente. Confirma?'}
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
                  {deleteMutation.isPending ? 'Removendo...' : 'Sim, Remover'}
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
