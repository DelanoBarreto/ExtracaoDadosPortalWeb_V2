'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Check, 
  ChevronRight,
  Clock,
  Hash,
  UploadCloud,
  FileText,
  Trash2,
  Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

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
    <div className="unified-editor-shell">
      {/* ── Header Corporativo Unificado (Sticky Glass) ────────────────────────────── */}
      <header className="unified-header flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/lrf')}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-[var(--color-border-soft)] text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="label-caps !text-[9px] !tracking-[0.2em] opacity-50">Controle de Contas</span>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="label-caps !text-[9px] !text-emerald-600 !tracking-[0.2em] font-black uppercase">Gestão de LRF</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-ink)]">
              {id === 'new' ? 'Novo Documento Fiscal' : 'Refinar LRF'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/lrf')}
            className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            Descartar
          </button>
          <button 
            onClick={() => saveMutation.mutate({ ...formData, status: 'rascunho' })}
            className="px-6 py-3 bg-white border border-[var(--color-border-soft)] text-[var(--color-ink)] rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:border-[var(--color-primary)] transition-all flex items-center gap-2"
          >
            <Save size={14} />
            Rascunho
          </button>
          <button 
            onClick={() => saveMutation.mutate({ ...formData, status: 'publicado' })}
            className="px-8 py-3.5 bg-[var(--color-primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2 active:scale-95"
          >
            <Check size={16} />
            Efetivar Publicação
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 px-12 pb-20">
        {/* Coluna Esquerda: Dados Formais */}
        <div className="lg:col-span-8 space-y-12">
          <section className="space-y-10">
            <div className="space-y-2">
              <label className="label-caps !text-[9px] text-slate-400 font-bold">Título Formal do Documento</label>
              <input 
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full bg-transparent border-b-2 border-slate-100 focus:border-[var(--color-primary)] py-4 text-4xl font-black text-[var(--color-ink)] outline-none transition-all placeholder:text-slate-100 tracking-tight"
                placeholder="Ex: RGF - 3º Quadrimestre..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="space-y-2">
                <label className="label-caps !text-[9px] text-slate-400 font-bold">Categoria Fiscal</label>
                <input 
                  value={formData.categoria_lrf}
                  onChange={(e) => setFormData({ ...formData, categoria_lrf: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-100 py-2 text-md font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] transition-all"
                  placeholder="Ex: RGF"
                />
              </div>
              <div className="space-y-2">
                <label className="label-caps !text-[9px] text-slate-400 font-bold">Exercício (Ano)</label>
                <input 
                  value={formData.exercicio}
                  onChange={(e) => setFormData({ ...formData, exercicio: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-100 py-2 text-md font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] transition-all"
                  placeholder="2024"
                />
              </div>
              <div className="space-y-2">
                <label className="label-caps !text-[9px] text-slate-400 font-bold">Competência</label>
                <input 
                  value={formData.competencia}
                  onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-100 py-2 text-md font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] transition-all"
                  placeholder="3º Quadrimestre"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="label-caps !text-[9px] text-slate-400 font-bold flex items-center gap-2">
                <FileText size={12} className="text-[var(--color-primary)]" /> Justificativa Legal
              </label>
              <div className="bg-white rounded-3xl border border-[var(--color-border-soft)] shadow-sm overflow-hidden min-h-[350px]">
                <RichTextEditor 
                  content={formData.descricao}
                  onChange={(html) => setFormData({ ...formData, descricao: html })}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Coluna Direita: Metadados Fiscal */}
        <div className="lg:col-span-4 space-y-10">
          <div className="space-y-10 sticky top-32">
            <div className="space-y-4">
              <label className="label-caps !text-[9px] text-slate-400 font-bold px-1">Status de Fiscalização</label>
              <div className="p-1 bg-slate-50 rounded-xl flex gap-1 border border-slate-100">
                {['rascunho', 'publicado', 'arquivado'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFormData({ ...formData, status: st })}
                    className={`flex-1 py-2.5 text-[9px] uppercase font-black tracking-widest rounded-lg transition-all ${
                      formData.status === st 
                        ? 'bg-white text-emerald-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="label-caps !text-[9px] text-slate-400 font-bold px-1">Documento Digital</label>
              <div className="aspect-video rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 bg-emerald-50/10 hover:bg-white hover:border-emerald-500 transition-all cursor-pointer group shadow-sm overflow-hidden">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-110 transition-all">
                  <UploadCloud size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">
                    {formData.url_arquivo ? 'Substituir PDF' : 'Anexar PDF Oficial'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-[#0f172a] rounded-[2rem] shadow-xl space-y-5 border border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[60px]" />
               <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Hash size={12} /> Protocolo
                  </span>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold">
                    {id === 'new' ? '#NOVO' : id?.toString().slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar size={12} /> Data do Ato
                  </span>
                  <input 
                    type="date" 
                    value={formData.data} 
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })} 
                    className="bg-transparent border-none text-[9px] text-slate-300 font-bold outline-none text-right cursor-pointer hover:text-white" 
                  />
                </div>
               </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleDelete}
                className="w-full py-4 rounded-2xl bg-red-50 text-red-500 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 group"
              >
                <Trash2 size={16} />
                Revogar Documento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
