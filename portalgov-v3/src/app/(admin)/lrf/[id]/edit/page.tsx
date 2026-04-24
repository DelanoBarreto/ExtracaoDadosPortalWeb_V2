'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Check, ChevronRight, Hash, 
  UploadCloud, FileText, Trash2, Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { X, Plus } from 'lucide-react';

export default function EditLRFPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id;

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria_lrf: '',
    exercicio: new Date().getFullYear().toString(),
    data: '',
    competencia: '',
    status: 'rascunho',
    url_arquivo: ''
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['RGF', 'RREO', 'LOA', 'LDO', 'PPA']);

  const { data: item, isLoading } = useQuery({
    queryKey: ['lrf', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/lrf/${id}`);
      return data;
    },
    enabled: !!id && id !== 'new'
  });

  useEffect(() => {
    if (item) {
      setFormData({
        titulo: item.titulo || '',
        descricao: item.descricao || '',
        categoria_lrf: item.categoria_lrf || '',
        exercicio: item.exercicio || new Date().getFullYear().toString(),
        data: item.data || '',
        competencia: item.competencia || '',
        status: item.status || 'rascunho',
        url_arquivo: item.url_arquivo || ''
      });

      if (item.categoria_lrf && !availableCategories.includes(item.categoria_lrf)) {
        setAvailableCategories(prev => [...prev, item.categoria_lrf]);
      }
    }
  }, [item]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id === 'new') return axios.post('/api/lrf', data);
      return axios.put(`/api/lrf/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrf'] });
      router.push('/lrf');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/admin/delete-items', { ids: [id], modulo: 'lrf' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrf'] });
      router.push('/lrf');
    }
  });

  const handleDelete = () => {
    if (window.confirm("Deseja realmente revogar este documento? Os dados serão removidos permanentemente.")) {
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
            onClick={() => router.push('/lrf')}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-city-hall-blue tracking-tight m-0 leading-none">
              {id === 'new' ? 'Novo Documento LRF' : 'Editar Documento LRF'}
            </h2>
            <div className="text-[12px] text-slate-500 mt-1">
              Preencha os campos abaixo para {id === 'new' ? 'criar' : 'atualizar'} o documento.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/lrf')}
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

      {/* ── Grid Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {/* Main Content */}
        <div className="lg:col-span-2 bg-white border border-border-color rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Título do Documento</label>
            <input 
              id="field-titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-categoria_lrf')?.focus(); } }}
              className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              placeholder="Ex: Relatório de Gestão Fiscal - 1º Quadrimestre 2024"
            />
          </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Categoria Fiscal</label>
                <div className="flex gap-2">
                  <select
                    id="field-categoria_lrf"
                    value={formData.categoria_lrf}
                    onChange={(e) => setFormData({ ...formData, categoria_lrf: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-exercicio')?.focus(); } }}
                    className="flex-1 bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                  >
                    <option value="">Selecione...</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="px-3 py-2 border border-border-color rounded-md bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-text-secondary transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                    title="Nova Categoria"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Exercício (Ano)</label>
                <input 
                  id="field-exercicio"
                  value={formData.exercicio}
                  onChange={(e) => setFormData({ ...formData, exercicio: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-competencia')?.focus(); } }}
                  className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                  placeholder="2024"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Competência</label>
                <input 
                  id="field-competencia"
                  value={formData.competencia}
                  onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                  className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                  placeholder="Ex: 1º Quadrimestre"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <FileText size={14} className="text-city-hall-blue" /> Descrição / Justificativa
              </label>
              <div className="bg-white rounded-md border border-border-color overflow-hidden min-h-[400px] focus-within:ring-2 focus-within:ring-city-hall-accent/50 focus-within:border-city-hall-accent transition-colors">
                <RichTextEditor 
                  content={formData.descricao}
                  onChange={(html) => setFormData({ ...formData, descricao: html })}
                />
              </div>
            </div>
        </div>

        {/* Sidebar Metadata */}
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
              <label className="text-[13px] font-semibold text-slate-700">Data do Ato</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  value={formData.data} 
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })} 
                  className="w-full bg-white border border-border-color rounded-md pl-9 pr-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Documento PDF</label>
              <div className="aspect-video w-full rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:border-city-hall-accent hover:bg-blue-50/50 transition-all cursor-pointer group overflow-hidden">
                <UploadCloud size={24} className="text-slate-400 group-hover:text-city-hall-accent transition-colors" />
                <span className="text-[12px] font-medium text-slate-500 group-hover:text-city-hall-accent transition-colors">
                  {formData.url_arquivo ? 'Trocar PDF' : 'Anexar PDF'}
                </span>
                {formData.url_arquivo && <p className="text-[10px] text-city-hall-accent mt-1 truncate max-w-full px-2">Arquivo carregado</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-border-color">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Hash size={14} /> ID Interno
                </span>
                <span className="font-mono text-[12px] text-text-secondary">
                  {id === 'new' ? 'NOVO' : id?.toString().slice(0, 8).toUpperCase()}
                </span>
              </div>
              <button 
                onClick={handleDelete}
                className="w-full py-2.5 rounded-md border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={15} /> Revogar Documento
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* ── Modal de Nova Categoria ────────────────────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-city-hall-blue m-0">Nova Categoria LRF</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-text-primary">Nome da Categoria</label>
                <input 
                  autoFocus
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategory.trim()) {
                      setAvailableCategories(prev => [...prev, newCategory.trim()]);
                      setFormData(prev => ({ ...prev, categoria_lrf: newCategory.trim() }));
                      setNewCategory('');
                      setIsCategoryModalOpen(false);
                    }
                  }}
                  className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-1 focus:ring-city-hall-accent transition-colors"
                  placeholder="Ex: Balanço Anual"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border-color bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-white border border-border-color rounded-md text-[13px] font-medium text-text-secondary hover:bg-gray-100 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (newCategory.trim()) {
                    setAvailableCategories(prev => [...prev, newCategory.trim()]);
                    setFormData(prev => ({ ...prev, categoria_lrf: newCategory.trim() }));
                    setNewCategory('');
                    setIsCategoryModalOpen(false);
                  }
                }}
                className="px-4 py-2 bg-city-hall-accent text-white rounded-md text-[13px] font-medium hover:bg-city-hall-blue transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
