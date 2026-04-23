'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Check, ChevronRight, Hash, X,
  UploadCloud, FileText, Trash2, Clock, User, Mail, Phone, Watch
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

export default function EditSecretariaPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id;

  const [formData, setFormData] = useState({
    nome: '',
    secretario: '',
    email: '',
    telefone: '',
    horario_funcionamento: '',
    descricao: '',
    status: 'rascunho',
    imagem_url: ''
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ['secretaria', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/secretarias/${id}`);
      return data;
    },
    enabled: !!id && id !== 'new'
  });

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome || '',
        secretario: item.secretario || '',
        email: item.email || '',
        telefone: item.telefone || '',
        horario_funcionamento: item.horario_funcionamento || '',
        descricao: item.descricao || '',
        status: item.status || 'rascunho',
        imagem_url: item.imagem_url || ''
      });
    }
  }, [item]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id === 'new') return axios.post('/api/secretarias', data);
      return axios.put(`/api/secretarias/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretarias'] });
      router.push('/secretarias');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/admin/delete-items', { ids: [id], modulo: 'secretarias' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretarias'] });
      router.push('/secretarias');
    }
  });

  const handleDelete = () => {
    if (window.confirm("Deseja realmente extinguir este órgão? Todos os dados e fotos serão removidos permanentemente.")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* ── Main Header ────────────────────────────────────────────── */}
      <header className="px-8 pt-6 pb-4 bg-white flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/secretarias')}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-city-hall-blue tracking-tight m-0 leading-none">
              {id === 'new' ? 'Nova Secretaria' : 'Editar Secretaria'}
            </h2>
            <div className="text-[12px] text-slate-500 mt-1">
              Preencha os campos abaixo para {id === 'new' ? 'criar' : 'atualizar'} o órgão.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/secretarias')}
            className="px-4 py-2 border border-border-color bg-white rounded-md text-[13px] font-semibold text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <X size={15} />
            Cancelar
          </button>
          <button 
            onClick={() => saveMutation.mutate(formData)}
            className="px-4 py-2 bg-city-hall-accent text-white rounded-md text-[13px] font-medium hover:bg-city-hall-blue transition-colors flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <Save size={15} />
            Salvar Alterações
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        
        {/* Coluna Principal */}
        <div className="lg:col-span-2 bg-white border border-border-color rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Denominação da Secretaria</label>
            <input 
              id="field-nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-secretario')?.focus(); } }}
              className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              placeholder="Ex: Secretaria Municipal de Educação"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <User size={14} className="text-city-hall-blue" /> Responsável / Titular
              </label>
              <input 
                id="field-secretario"
                value={formData.secretario}
                onChange={(e) => setFormData({ ...formData, secretario: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-email')?.focus(); } }}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-telefone')?.focus(); } }}
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
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-horario')?.focus(); } }}
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
                onChange={(e) => setFormData({ ...formData, horario_funcionamento: e.target.value })}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                placeholder="Ex: Seg a Sex, 08h às 14h"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <FileText size={14} className="text-city-hall-blue" /> Competências e Atribuições
            </label>
            <div className="bg-white rounded-md border border-border-color overflow-hidden min-h-[400px] focus-within:ring-2 focus-within:ring-city-hall-accent/50 focus-within:border-city-hall-accent transition-colors">
              <RichTextEditor 
                content={formData.descricao}
                onChange={(html) => setFormData({ ...formData, descricao: html })}
              />
            </div>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-border-color rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Visibilidade</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              >
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Foto da Sede / Fachada</label>
              <div className="aspect-video w-full rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:border-city-hall-accent hover:bg-blue-50/50 transition-all cursor-pointer group overflow-hidden">
                {formData.imagem_url ? (
                  <img src={formData.imagem_url} alt="Capa" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <UploadCloud size={24} className="text-slate-400 group-hover:text-city-hall-accent transition-colors" />
                    <span className="text-[12px] font-medium text-slate-500 group-hover:text-city-hall-accent transition-colors">
                      Carregar Imagem
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border-color">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Hash size={14} /> Cód. Unidade
                </span>
                <span className="font-mono text-[12px] text-text-secondary">
                  {id === 'new' ? 'AUTO' : id?.toString().slice(0, 8).toUpperCase()}
                </span>
              </div>
              <button 
                onClick={handleDelete}
                className="w-full py-2.5 rounded-md border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={15} /> Extinguir Órgão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
