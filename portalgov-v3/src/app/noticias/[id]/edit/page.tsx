'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Check, 
  X, 
  Trash2, 
  ChevronRight,
  Clock,
  Eye,
  Hash,
  UploadCloud,
  FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

export default function EditNoticiaPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id;

  const [formData, setFormData] = useState({
    titulo: '',
    resumo: '',
    conteudo: '',
    autor: '',
    ano: new Date().getFullYear().toString(),
    url_fonte: '',
    status: 'rascunho',
    categoria: [] as string[]
  });

  // Buscar dados da notícia
  const { data: noticia, isLoading } = useQuery({
    queryKey: ['noticia', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/noticias/${id}`);
      return data;
    },
    enabled: !!id && id !== 'new'
  });

  useEffect(() => {
    if (noticia) {
      setFormData({
        titulo: noticia.titulo || '',
        resumo: noticia.resumo || '',
        conteudo: noticia.conteudo || '',
        autor: noticia.autor || '',
        ano: noticia.ano || new Date().getFullYear().toString(),
        url_fonte: noticia.url_fonte || '',
        status: noticia.status || 'rascunho',
        categoria: noticia.categoria || []
      });
    }
  }, [noticia]);

  // Mutação para salvar
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id === 'new') {
        return axios.post('/api/noticias', data);
      }
      return axios.put(`/api/noticias/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noticias'] });
      router.push('/noticias');
    }
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header Corporativo Unificado ────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/noticias')}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-[var(--color-border-soft)] text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="label-caps !text-[9px] !tracking-[0.2em] opacity-50">Gestão de Conteúdo</span>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="label-caps !text-[9px] !text-[var(--color-primary)] !tracking-[0.2em] font-black">Editor Elite</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-ink)]">
              {id === 'new' ? 'Nova Publicação' : 'Refinar Conteúdo'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/noticias')}
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
            Publicar Agora
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20">
        {/* Coluna Esquerda: Fluxo de Escrita */}
        <div className="lg:col-span-8 space-y-12">
          <section className="space-y-10">
            <div className="space-y-2">
              <label className="label-caps !text-[9px] text-slate-400 font-bold">Título da Publicação</label>
              <input 
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full bg-transparent border-b-2 border-slate-100 focus:border-[var(--color-primary)] py-4 text-4xl font-black text-[var(--color-ink)] outline-none transition-all placeholder:text-slate-100 tracking-tight"
                placeholder="Insira um título..."
              />
            </div>

            <div className="space-y-2">
              <label className="label-caps !text-[9px] text-slate-400 font-bold">Resumo Executivo</label>
              <textarea 
                value={formData.resumo}
                onChange={(e) => setFormData({ ...formData, resumo: e.target.value })}
                className="w-full bg-slate-50/30 border border-slate-100 rounded-2xl p-6 text-lg font-medium text-[var(--color-ink-secondary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-primary-glow)] focus:border-[var(--color-primary)] transition-all min-h-[120px] resize-none leading-relaxed"
                placeholder="Breve descrição..."
              />
            </div>

            <div className="space-y-4 pt-4">
              <label className="label-caps !text-[9px] text-slate-400 font-bold flex items-center gap-2">
                <FileText size={12} className="text-[var(--color-primary)]" /> Corpo do Conteúdo
              </label>
              <div className="bg-white rounded-3xl border border-[var(--color-border-soft)] shadow-sm overflow-hidden min-h-[500px]">
                <RichTextEditor 
                  content={formData.conteudo}
                  onChange={(html) => setFormData({ ...formData, conteudo: html })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-slate-50">
              <div className="space-y-2">
                <label className="label-caps !text-[9px] text-slate-400 font-bold">Autor</label>
                <input 
                  value={formData.autor}
                  onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-100 py-2 text-md font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] transition-all"
                  placeholder="Nome do autor..."
                />
              </div>
              <div className="space-y-2">
                <label className="label-caps !text-[9px] text-slate-400 font-bold">Ano</label>
                <input 
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  className="w-full bg-transparent border-b border-slate-100 py-2 text-md font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] transition-all"
                  placeholder="2025"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Coluna Direita: Metadados & Status */}
        <div className="lg:col-span-4 space-y-10">
          <div className="space-y-10 sticky top-10">
            <div className="space-y-4">
              <label className="label-caps !text-[9px] text-slate-400 font-bold px-1">Fluxo de Trabalho</label>
              <div className="p-1 bg-slate-50 rounded-xl flex gap-1 border border-slate-100">
                {['rascunho', 'publicado', 'arquivado'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFormData({ ...formData, status: st })}
                    className={`flex-1 py-2.5 text-[9px] uppercase font-black tracking-widest rounded-lg transition-all ${
                      formData.status === st 
                        ? 'bg-white text-[var(--color-primary)] shadow-sm' 
                        : 'text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="label-caps !text-[9px] text-slate-400 font-bold px-1">Capa da Matéria</label>
              <div className="aspect-video rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 bg-slate-50/30 hover:bg-white hover:border-[var(--color-primary)] transition-all cursor-pointer group shadow-sm overflow-hidden">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-200 group-hover:text-[var(--color-primary)] shadow-sm group-hover:scale-110 transition-all">
                  <UploadCloud size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">Upload Mídia</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-[#0f172a] rounded-[2rem] shadow-xl space-y-5 border border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[60px]" />
               <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Hash size={12} /> Registro
                  </span>
                  <span className="font-mono text-[9px] text-blue-400 font-bold">
                    {id === 'new' ? '#AUTO' : id?.toString().slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock size={12} /> Publicação
                  </span>
                  <span className="text-[9px] text-slate-300 font-bold uppercase">
                    {noticia?.data_publicacao ? new Date(noticia.data_publicacao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Eye size={12} /> Audiência
                  </span>
                  <span className="text-[9px] text-slate-300 font-bold">
                    {noticia?.views || 0} acessos
                  </span>
                </div>
               </div>
            </div>

            <div className="pt-4">
              <button className="w-full py-4 rounded-2xl bg-red-50 text-red-500 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 group">
                <Trash2 size={16} />
                Excluir Registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
