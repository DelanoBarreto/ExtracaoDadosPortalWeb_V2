"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Check, Globe, ShieldCheck,
  Save, Search, ChevronLeft, ChevronRight, X, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMunicipalityStore, Municipality } from '@/store/municipality';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

const PAGE_SIZE = 15;

interface MunicipioForm {
  nome:     string;
  url_base: string;
}

const EMPTY_FORM: MunicipioForm = { nome: '', url_base: '' };

export default function ConfiguracoesPage() {
  const {
    currentMunicipality,
    municipalities,
    setCurrentMunicipality,
    addMunicipality,
    updateMunicipality,
    removeMunicipality,
    setMunicipalities,
  } = useMunicipalityStore();

  const [form,         setForm]         = useState<MunicipioForm>(EMPTY_FORM);
  const [editingId,    setEditingId]     = useState<string | null>(null);
  const [showForm,     setShowForm]      = useState(false);
  const [search,       setSearch]        = useState('');
  const [page,         setPage]          = useState(0);
  const [saving,       setSaving]        = useState(false);
  const [loading,      setLoading]       = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Carrega do Supabase ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('tab_municipios')
        .select('*')
        .order('nome', { ascending: true });

      if (data && !error) {
        const mapped: Municipality[] = data.map(m => ({
          id:   m.id,
          name: m.nome,
          url:  m.url_base,
        }));
        setMunicipalities(mapped);
      }
      setLoading(false);
    }
    load();
  }, [setMunicipalities]);

  // ── Filtro + Paginação (client-side para resposta imediata) ───────────────
  const filtered = useMemo(() =>
    municipalities.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.url.toLowerCase().includes(search.toLowerCase())
    ),
    [municipalities, search]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reseta para a página 0 ao buscar
  useEffect(() => { setPage(0); }, [search]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (m: Municipality) => {
    setEditingId(m.id);
    setForm({ nome: m.name, url_base: m.url });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.url_base.trim()) return;
    setSaving(true);

    try {
      if (editingId) {
        // Editar
        const res = await axios.post('/api/admin/municipios', {
          action: 'update',
          id: editingId,
          nome: form.nome.trim(),
          url_base: form.url_base.trim()
        });

        if (res.data.data) {
          updateMunicipality({ id: editingId, name: form.nome.trim(), url: form.url_base.trim() });
          setShowForm(false);
        } else {
          console.error("Erro ao editar:", res.data.error);
          alert(`Erro ao editar: ${res.data.error}`);
        }
      } else {
        // Novo
        const res = await axios.post('/api/admin/municipios', {
          action: 'insert',
          nome: form.nome.trim(),
          url_base: form.url_base.trim()
        });

        if (res.data.data) {
          const data = res.data.data;
          addMunicipality({ id: data.id, name: data.nome, url: data.url_base });
          setCurrentMunicipality(data.id);
          setShowForm(false);
        } else {
          console.error("Erro ao inserir:", res.data.error);
          alert(`Erro ao inserir: ${res.data.error || 'Desconhecido'}`);
        }
      }
    } catch (err: any) {
        console.error("Erro na requisição:", err);
        alert(`Erro na requisição: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.post('/api/admin/municipios', { action: 'delete', id });
      removeMunicipality(id);
      setConfirmDelete(null);
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert(`Erro ao excluir: ${err.response?.data?.error || err.message}`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 leading-tight tracking-tight">
            Configurações
          </h1>
          <p className="text-slate-500 text-[13px] font-medium">
            Gerencie os municípios monitorados e preferências do sistema
          </p>
        </div>
        <button
          onClick={openNew}
          className="h-9 px-4 rounded-xl bg-[#004c99] text-white text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <Plus size={16} /> Novo Município
        </button>
      </div>

      {/* ── Card Principal: Município Ativo ──────────────────────────────────── */}
      {currentMunicipality && (
        <div className="bg-[#004c99]/5 border border-[#004c99]/15 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#004c99] flex items-center justify-center text-white font-black text-base shrink-0">
            {currentMunicipality.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-[#004c99] uppercase tracking-widest mb-0.5">Município Ativo</p>
            <p className="text-[14px] font-bold text-slate-900 leading-none">{currentMunicipality.name}</p>
            <p className="text-[12px] text-slate-500 flex items-center gap-1 mt-0.5">
              <Globe size={11} /> {currentMunicipality.url}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Check size={12} /> Selecionado
          </div>
        </div>
      )}

      {/* ── Tabela de Municípios ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-4">
          <div className="relative group flex-1 max-w-[320px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#004c99]" />
            <input
              type="text"
              placeholder={`Buscar municípios...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>
          <span className="ml-auto text-[11px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5 border-l border-slate-200">
            {filtered.length} DOCS
          </span>
        </div>

        {/* Cabeçalho */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-[#F8FAFC]">
              <th className="px-6 py-2.5 text-[0.7rem] font-normal uppercase text-slate-500 tracking-wider w-8">
                {/* Check coluna */}
              </th>
              <th className="px-6 py-2.5 text-[0.7rem] font-normal uppercase text-slate-500 tracking-wider">Nome do Município</th>
              <th className="px-6 py-2.5 text-[0.7rem] font-normal uppercase text-slate-500 tracking-wider">URL Base</th>
              <th className="px-6 py-2.5 text-[0.7rem] font-normal uppercase text-slate-500 tracking-wider text-center w-24">Status</th>
              <th className="px-6 py-2.5 text-[0.7rem] font-normal uppercase text-slate-500 tracking-wider text-right w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 size={22} className="animate-spin mx-auto text-[#004c99] mb-2" />
                  <span className="text-[13px] text-slate-400">Carregando municípios...</span>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[13px] text-slate-400">
                  {search ? `Nenhum município encontrado para "${search}".` : 'Nenhum município cadastrado.'}
                </td>
              </tr>
            ) : paginated.map(m => {
              const isAtivo = currentMunicipality?.id === m.id;
              return (
                <tr
                  key={m.id}
                  onClick={() => setCurrentMunicipality(m.id)}
                  className={`transition-colors cursor-pointer border-b border-slate-50 ${
                    isAtivo ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <td className="px-6 py-2.5 w-8">
                    {isAtivo && (
                      <div className="w-5 h-5 rounded-full bg-[#004c99] flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isAtivo ? 'bg-[#004c99] text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`text-[0.85rem] font-medium ${isAtivo ? 'text-[#004c99]' : 'text-slate-800'}`}>
                        {m.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-2.5 text-[0.8rem] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Globe size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[260px]">{m.url}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase ${
                      isAtivo ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isAtivo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 text-slate-500 hover:text-[#004c99] hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-200"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(m.id)}
                        className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Paginação */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
              Página {page + 1} de {totalPages} • {filtered.length} municípios
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Card Info ────────────────────────────────────────────────────────── */}
      <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <p className="text-emerald-900 font-bold text-[13px]">Persistência automática no banco</p>
          <p className="text-emerald-600 text-[12px] leading-relaxed mt-0.5">
            Todos os municípios são armazenados no Supabase. O município ativo é salvo no localStorage e restaurado automaticamente a cada sessão. O sistema suporta qualquer quantidade de prefeituras.
          </p>
        </div>
      </div>

      {/* ── Modal: Formulário (Novo / Editar) ───────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[20px] font-black text-slate-900">
                    {editingId ? 'Editar Município' : 'Novo Município'}
                  </h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    {editingId ? 'Atualize os dados do município' : 'Adicione uma nova prefeitura ao sistema'}
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Nome da Prefeitura
                  </label>
                  <input
                    autoFocus
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-url-base')?.focus();
                      }
                    }}
                    placeholder="Ex: Prefeitura de Aracati"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    URL Base (domínio do portal)
                  </label>
                  <input
                    id="input-url-base"
                    value={form.url_base}
                    onChange={e => setForm(f => ({ ...f, url_base: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (form.nome.trim() && form.url_base.trim() && !saving) {
                          handleSave();
                        }
                      }
                    }}
                    placeholder="Ex: https://www.aracati.ce.gov.br"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-[#004c99] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-11 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.nome.trim() || !form.url_base.trim() || saving}
                  className="flex-1 h-11 bg-[#004c99] text-white rounded-xl text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Confirmar Exclusão ────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-5">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[18px] font-black text-slate-900 mb-2">Excluir Município</h3>
              <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
                Deseja realmente excluir este município? Todos os dados de notícias, LRF e secretarias vinculados podem ser afetados.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-11 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 h-11 bg-red-500 text-white rounded-xl text-[13px] font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
