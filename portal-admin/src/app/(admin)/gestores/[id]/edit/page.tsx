'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, X, Hash, UploadCloud,
  Trash2, User, Building2, Calendar, Link as LinkIcon, Image
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { useMunicipalityStore } from '@/store/municipality';
import { useUiStore } from '@/store/ui';

export default function EditGestorPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { currentMunicipality } = useMunicipalityStore();
  const { setSidebarLocked } = useUiStore();
  const id = params.id as string;
  const isNew = id === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDirty, setIsDirty] = useState(false);
  const isNavigatingAway = useRef(false);

  const [formData, setFormData] = useState({
    nome: '',
    cargo: 'PREFEITO(A)',
    data_inicio: '',
    data_fim: '',
    is_atual: false,
    status: 'rascunho',
    foto_url: '',
    url_origem: '',
  });
  const [uploading, setUploading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const { data: item, isLoading, isError, error } = useQuery({
    queryKey: ['gestores', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/gestores/${id}`);
      return data;
    },
    enabled: !!id && !isNew,
    retry: 1,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome || '',
        cargo: item.cargo || 'PREFEITO(A)',
        data_inicio: item.data_inicio ? item.data_inicio.substring(0, 10) : '',
        data_fim: item.data_fim ? item.data_fim.substring(0, 10) : '',
        is_atual: item.is_atual || false,
        status: item.status || 'rascunho',
        foto_url: item.foto_url || '',
        url_origem: item.url_origem || '',
      });
      setIsDirty(false);
      setSidebarLocked(false);
    } else if (isNew) {
      setIsDirty(false);
      setSidebarLocked(false);
    }
  }, [item, isNew, setSidebarLocked]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSidebarLocked(true);
  };

  // ── Upload de foto para Supabase Storage via API ────────────────────────
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const municipioNome = currentMunicipality?.name || 'geral';
      const ext = file.name.split('.').pop();
      const path = `${municipioNome}/gestores/${Date.now()}.${ext}`;

      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('path', path);
      uploadData.append('bucket', 'arquivos_municipais');

      const { data } = await axios.post('/api/admin/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      handleChange('foto_url', data.publicUrl);
    } catch (err: any) {
      alert('Erro ao fazer upload: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        municipio_id: currentMunicipality?.id,
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
      };

      if (isNew) {
        return axios.post('/api/gestores', payload);
      }
      return axios.put(`/api/gestores/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestores'] });
      queryClient.invalidateQueries({ queryKey: ['gestores-counts'] });
      if (!isNew) {
        queryClient.removeQueries({ queryKey: ['gestores', id] });
      }
      setIsDirty(false);
      setSidebarLocked(false);
      router.push('/gestores');
    },
    onError: (err: any) => {
      console.error('Save error:', err);
      alert('Erro ao salvar: ' + (err.response?.data?.error || err.message));
    }
  });

  // Tratar botão de Voltar
  const handleBack = () => {
    if (!isDirty) {
      isNavigatingAway.current = true;
      setSidebarLocked(false);
      router.push('/gestores');
    }
  };

  // Tratar Cancelar (sai sem salvar)
  const handleCancel = () => {
    isNavigatingAway.current = true;
    setSidebarLocked(false);
    router.push('/gestores');
  };

  // Listener para prevenir fechamento da aba se houver dados não salvos
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!isNavigatingAway.current) {
         setSidebarLocked(false);
      }
    };
  }, [isDirty, setSidebarLocked]);

  // ── Delete ────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/gestores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestores'] });
      queryClient.invalidateQueries({ queryKey: ['gestores-counts'] });
      router.push('/gestores');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Deseja realmente excluir este gestor? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate();
    }
  };

  // ── Navegação com Enter ───────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      const focusable = Array.from(document.querySelectorAll('input, select, textarea'))
        .filter(el => !el.hasAttribute('disabled')) as HTMLElement[];
      const index = focusable.indexOf(e.target as HTMLElement);
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
      }
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-bg-main">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-city-hall-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">Carregando dados...</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="flex items-center justify-center h-screen bg-bg-main p-8">
      <div className="bg-white border border-red-100 rounded-2xl p-10 max-w-md w-full shadow-xl text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <X size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Erro ao carregar dados</h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          {(error as any)?.response?.data?.error || (error as any)?.message || 'Ocorreu um erro ao buscar as informações do gestor.'}
        </p>
        <button 
          onClick={() => router.push('/gestores')}
          className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
        >
          Voltar para Lista
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* ── Header Sticky ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-[100] px-8 py-4 bg-white/90 backdrop-blur-md flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px] shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            disabled={isDirty}
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all border ${isDirty ? 'text-slate-300 cursor-not-allowed border-transparent opacity-50' : 'hover:bg-slate-100 text-slate-500 border-transparent hover:border-slate-200'}`}
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight m-0 leading-none">
              {isNew ? 'Novo Gestor' : 'Editar Gestor'}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isNew ? 'Adicionar prefeito ou vice' : 'Atualizar informações do gestor'}
              </p>
              {isDirty && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Não salvo</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button
            onClick={handleCancel}
            className="h-10 px-4 border border-slate-200 bg-white rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <X size={16} /> Cancelar
          </button>
          <button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending || (!isDirty && !isNew) || !formData.nome}
            className="h-10 px-6 bg-[#004c99] text-white rounded-xl text-[13px] font-bold hover:bg-[#003366] transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">

        {/* ── Coluna Principal ── */}
        <div className="lg:col-span-2 bg-white border border-border-color rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-5">

          {/* Nome do Gestor */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <User size={14} className="text-city-hall-blue" /> Nome Completo
            </label>
            <input
              id="field-nome"
              value={formData.nome}
              onChange={e => handleChange('nome', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              placeholder="Ex: João da Silva..."
            />
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Building2 size={14} className="text-city-hall-blue" /> Cargo
              </label>
              <select
                id="field-cargo"
                value={formData.cargo}
                onChange={e => handleChange('cargo', e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              >
                <option value="PREFEITO(A)">Prefeito(a)</option>
                <option value="VICE-PREFEITO(A)">Vice-Prefeito(a)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Calendar size={14} className="text-city-hall-blue" /> Data de Início
              </label>
              <input
                id="field-inicio"
                type="date"
                value={formData.data_inicio}
                onChange={e => handleChange('data_inicio', e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              />
            </div>

            <div className="pt-6">
               <div className="flex items-center gap-3 p-[9px] bg-blue-50/50 border border-blue-100 rounded-md">
                 <input 
                    type="checkbox" 
                    id="is_atual"
                    checked={formData.is_atual}
                    onChange={e => handleChange('is_atual', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#004c99] focus:ring-[#004c99] cursor-pointer"
                 />
                 <label htmlFor="is_atual" className="text-[13px] font-semibold text-slate-700 cursor-pointer select-none">
                   Marcar como Mandato Atual
                 </label>
               </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Calendar size={14} className="text-city-hall-blue" /> Data de Fim
              </label>
              <input
                id="field-fim"
                type="date"
                value={formData.data_fim}
                onChange={e => handleChange('data_fim', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={formData.is_atual}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

          </div>

        </div>

        {/* ── Coluna Lateral ── */}
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-border-color rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">

            {/* Status da Publicação */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Status da Publicação</label>
              <select
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              >
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>

            {/* Foto Upload */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Image size={14} className="text-city-hall-blue" /> Imagem / Foto
              </label>

              {/* Preview */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="aspect-square w-full max-w-[300px] mx-auto rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:border-city-hall-accent hover:bg-blue-50/50 transition-all cursor-pointer group overflow-hidden relative shadow-inner"
              >
                {formData.foto_url ? (
                  <img
                    src={formData.foto_url}
                    alt="Foto do Gestor"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <>
                    <UploadCloud size={24} className="text-slate-400 group-hover:text-city-hall-accent transition-colors" />
                    <span className="text-[12px] font-medium text-slate-500 group-hover:text-city-hall-accent transition-colors text-center px-4">
                      {uploading ? 'Enviando...' : 'Clique para carregar imagem'}
                    </span>
                  </>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Input real oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />

              {/* Ações da foto */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 text-[12px] font-semibold border border-border-color rounded-md text-text-primary hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <UploadCloud size={13} /> {formData.foto_url ? 'Trocar Foto' : 'Carregar Foto'}
                </button>
                {formData.foto_url && (
                  <button
                    type="button"
                    onClick={() => handleChange('foto_url', '')}
                    className="py-1.5 px-3 text-[12px] font-semibold border border-red-200 rounded-md text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                    title="Remover foto"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* URL Manual (caso não consiga fazer upload por arquivo) */}
            <div className="space-y-1.5 pt-4 border-t border-border-color">
               <label className="text-[11px] font-semibold text-slate-500">URL da Imagem (Opcional)</label>
               <input
                 value={formData.foto_url}
                 onChange={e => handleChange('foto_url', e.target.value)}
                 className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[12px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                 placeholder="https://..."
               />
            </div>

            {/* Info + Excluir */}
            <div className="pt-4 border-t border-border-color">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Hash size={14} /> ID do Registro
                </span>
                <span className="font-mono text-[12px] text-text-secondary">
                  {isNew ? 'AUTO' : id?.toString().slice(0, 8).toUpperCase()}
                </span>
              </div>
              {!isNew && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="w-full py-2.5 rounded-md border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Gestor'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
