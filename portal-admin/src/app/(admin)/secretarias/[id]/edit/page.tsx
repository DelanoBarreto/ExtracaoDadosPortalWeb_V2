'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, X, Hash, UploadCloud,
  FileText, Trash2, User, Mail, Phone, Watch, Image, Calendar, ShieldCheck
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { supabase } from '@/lib/supabase';
import { useMunicipalityStore } from '@/store/municipality';

export default function EditSecretariaPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { currentMunicipality } = useMunicipalityStore();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nome_secretaria:         '',
    nome_responsavel:        '',
    email:                   '',
    telefone:                '',
    horario_funcionamento:   '',
    descricao:               '',
    status:                  'rascunho',
    foto_url:                '',
    exercicio:               '',
    data_publicacao:         '',
  });
  const [uploading, setUploading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────
  const { data: item, isLoading } = useQuery({
    queryKey: ['secretaria', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/secretarias/${id}`);
      return data;
    },
    enabled: !!id && id !== 'new',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        nome_secretaria:       item.nome_secretaria        || '',
        nome_responsavel:      item.nome_responsavel       || item.responsavel || '',
        email:                 item.email                  || '',
        telefone:              item.telefone               || '',
        horario_funcionamento: item.horario_funcionamento  || '',
        descricao:             item.descricao              || item.competencias || '',
        status:                item.status                 || 'rascunho',
        foto_url:              item.foto_url               || item.imagem_url || '',
        exercicio:             item.exercicio              || '',
        data_publicacao:       item.data_publicacao
          ? item.data_publicacao.substring(0, 10)
          : '',
      });
    }
  }, [item]);

  // ── Upload de foto para Supabase Storage ──────────────────────────────
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const municipioNome = currentMunicipality?.name || 'geral';
      const ext = file.name.split('.').pop();
      const path = `${municipioNome}/secretarias/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('arquivos_municipais')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('arquivos_municipais')
        .getPublicUrl(path);
      setFormData(prev => ({ ...prev, foto_url: urlData.publicUrl }));
    } catch (err: any) {
      alert('Erro ao fazer upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Filtra apenas os campos que o banco aceita
      const payload = {
        nome_secretaria:       data.nome_secretaria,
        nome_responsavel:      data.nome_responsavel,
        email:                 data.email,
        telefone:              data.telefone,
        horario_atendimento:   data.horario_funcionamento,
        status:                data.status,
        foto_url:              data.foto_url,
        exercicio:             data.exercicio ? parseInt(data.exercicio) : null,
        data_publicacao:       data.data_publicacao || null,
      };

      if (id === 'new') {
        return axios.post('/api/secretarias', {
          ...payload,
          municipio_id: currentMunicipality?.id,
        });
      }
      return axios.put(`/api/secretarias/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretarias'] });
      queryClient.invalidateQueries({ queryKey: ['secretarias-counts'] });
      alert('Alterações salvas com sucesso!');
      router.push('/secretarias');
    },
    onError: (err: any) => {
      console.error('Save error:', err);
      alert('Erro ao salvar: ' + (err.response?.data?.error || err.message));
    }
  });

  // ── Delete ────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/admin/delete-items', { ids: [id], modulo: 'secretarias' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretarias'] });
      router.push('/secretarias');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Deseja realmente extinguir este órgão? Esta ação não pode ser desfeita.')) {
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

  if (isLoading) return <div className="p-8 text-slate-500">Carregando...</div>;

  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* ── Header Sticky ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-[100] px-8 py-4 bg-white/90 backdrop-blur-md flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px] shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/secretarias')}
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-500 transition-all border border-transparent hover:border-slate-200"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight m-0 leading-none">
              {id === 'new' ? 'Nova Secretaria' : 'Editar Secretaria'}
            </h2>
            <p className="text-[11px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">
              {id === 'new' ? 'Criação de novo órgão' : `ID: ${id}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button
            onClick={() => router.push('/secretarias')}
            className="h-10 px-4 border border-slate-200 bg-white rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <X size={16} /> Cancelar
          </button>
          <button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
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

          {/* Nome da Secretaria */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Denominação da Secretaria</label>
            <input
              id="field-nome"
              value={formData.nome_secretaria}
              onChange={e => setFormData({ ...formData, nome_secretaria: e.target.value })}
              onKeyDown={handleKeyDown}
              className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              placeholder="Ex: Secretaria Municipal de Educação"
            />
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <User size={14} className="text-city-hall-blue" /> Responsável / Titular
              </label>
              <input
                id="field-responsavel"
                value={formData.nome_responsavel}
                onChange={e => setFormData({ ...formData, nome_responsavel: e.target.value })}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                placeholder="Nome do Secretário(a)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Mail size={14} className="text-city-hall-blue" /> E-mail de Contato
              </label>
              <input
                id="field-email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                placeholder="exemplo@municipio.gov.br"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Phone size={14} className="text-city-hall-blue" /> Telefone
              </label>
              <input
                id="field-telefone"
                value={formData.telefone}
                onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Watch size={14} className="text-city-hall-blue" /> Horário de Funcionamento
              </label>
              <input
                id="field-horario"
                value={formData.horario_funcionamento}
                onChange={e => setFormData({ ...formData, horario_funcionamento: e.target.value })}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                placeholder="Ex: Seg a Sex, 08h às 14h"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Calendar size={14} className="text-city-hall-blue" /> Exercício (Ano)
              </label>
              <input
                id="field-exercicio"
                type="number"
                value={formData.exercicio}
                onChange={e => setFormData({ ...formData, exercicio: e.target.value })}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                placeholder="Ex: 2025"
                min={2000}
                max={2100}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Calendar size={14} className="text-city-hall-blue" /> Data de Publicação
              </label>
              <input
                id="field-data"
                type="date"
                value={formData.data_publicacao}
                onChange={e => setFormData({ ...formData, data_publicacao: e.target.value })}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              />
            </div>
          </div>

          {/* Competências */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <FileText size={14} className="text-city-hall-blue" /> Competências e Atribuições
            </label>
            <div className="bg-white rounded-md border border-border-color overflow-hidden min-h-[400px] focus-within:ring-2 focus-within:ring-city-hall-accent/50 focus-within:border-city-hall-accent transition-colors">
              <RichTextEditor
                content={formData.descricao}
                onChange={html => setFormData({ ...formData, descricao: html })}
              />
            </div>
          </div>
        </div>

        {/* ── Coluna Lateral ── */}
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-border-color rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Visibilidade</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
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
                <Image size={14} className="text-city-hall-blue" /> Imagem
              </label>

              {/* Preview */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="aspect-square w-full max-w-[300px] mx-auto rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:border-city-hall-accent hover:bg-blue-50/50 transition-all cursor-pointer group overflow-hidden relative shadow-inner"
              >
                {formData.foto_url ? (
                  <img
                    src={formData.foto_url}
                    alt="Foto da secretaria"
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
                    onClick={() => setFormData(prev => ({ ...prev, foto_url: '' }))}
                    className="py-1.5 px-3 text-[12px] font-semibold border border-red-200 rounded-md text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                    title="Remover foto"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Info + Extinguir */}
            <div className="pt-4 border-t border-border-color">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Hash size={14} /> Cód. Unidade
                </span>
                <span className="font-mono text-[12px] text-text-secondary">
                  {id === 'new' ? 'AUTO' : id?.toString().slice(0, 8).toUpperCase()}
                </span>
              </div>
              {id !== 'new' && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="w-full py-2.5 rounded-md border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {deleteMutation.isPending ? 'Excluindo...' : 'Extinguir Órgão'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
