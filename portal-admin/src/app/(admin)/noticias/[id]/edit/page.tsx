"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Check, 
  Trash2, 
  UploadCloud,
  Loader2,
  X,
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { usePortalStore } from '@/store/usePortalStore';

export default function EditNoticiaPage() {
  const router = useRouter();
  const params = useParams();
  const { municipioAtivo } = usePortalStore();
  const queryClient = useQueryClient();
  const id = params.id;

  const [formData, setFormData] = useState({
    titulo: '',
    resumo: '',
    conteudo: '',
    autor: '',
    ano: new Date().getFullYear().toString(),
    data_publicacao: new Date().toISOString().split('T')[0],
    url_original: '',
    status: 'rascunho',
    categoria: '',
    imagem_url: ''
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['Geral', 'Educação', 'Saúde', 'Infraestrutura', 'Esportes', 'Cultura']);

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
      let dataPub = new Date().toISOString().split('T')[0];
      if (noticia.data_publicacao) {
        try { dataPub = new Date(noticia.data_publicacao).toISOString().split('T')[0]; } catch(e){}
      }

      setFormData({
        titulo: noticia.titulo || '',
        resumo: noticia.resumo || '',
        conteudo: noticia.conteudo || '',
        autor: noticia.autor || '',
        ano: noticia.data_publicacao ? new Date(noticia.data_publicacao).getFullYear().toString() : new Date().getFullYear().toString(),
        data_publicacao: dataPub,
        url_original: noticia.url_original || '',
        status: noticia.status || 'rascunho',
        categoria: noticia.categoria || '',
        imagem_url: noticia.imagem_url || ''
      });

      if (noticia.categoria && !availableCategories.includes(noticia.categoria)) {
        setAvailableCategories(prev => [...prev, noticia.categoria]);
      }
    }
  }, [noticia]);

  // Mutação para salvar — distingue criação (POST) de atualização (PUT)
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Limpeza de payload: envia apenas o que existe no banco
      const payload = {
        titulo: data.titulo,
        resumo: data.resumo,
        conteudo: data.conteudo,
        autor: data.autor,
        data_publicacao: data.data_publicacao,
        url_original: data.url_original,
        status: data.status,
        categoria: data.categoria,
        imagem_url: data.imagem_url,
      };

      if (id === 'new') {
        if (!municipioAtivo?.id) {
          throw new Error('Selecione um município ativo antes de criar uma notícia.');
        }
        return axios.post('/api/noticias', {
          ...payload,
          municipio_id: municipioAtivo.id,
        });
      }
      return axios.put(`/api/noticias/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noticias'] });
      router.push('/noticias');
    },
    onError: (error: any) => {
      alert(error?.response?.data?.error || error.message || 'Erro ao salvar.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/noticias/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noticias'] });
      router.push('/noticias');
    }
  });

  const handleDelete = () => {
    if (window.confirm("Deseja realmente excluir esta notícia? A imagem de capa e todos os dados serão removidos permanentemente.")) {
      deleteMutation.mutate();
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useState<any>(null); // Referência para o input file

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !municipioAtivo) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      // Padrão do scraper: [NomeMunicipio]/noticias
      const filePath = `${municipioAtivo.nome || municipioAtivo.name}/noticias/${fileName}`;

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('path', filePath);
      uploadFormData.append('bucket', 'arquivos_municipais');

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha no upload');

      setFormData(prev => ({ ...prev, imagem_url: data.publicUrl }));
    } catch (error: any) {
      console.error("Erro no upload da imagem:", error);
      alert("Erro ao enviar imagem: " + error.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-20 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Carregando dados da publicação...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* ── Main Header ────────────────────────────────────────────── */}
      <header className="px-8 pt-6 pb-4 bg-white flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/noticias')}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-city-hall-blue tracking-tight m-0 leading-none">
              {id === 'new' ? 'Nova Publicação' : 'Editar Publicação'}
            </h2>
            <div className="text-[12px] text-slate-500 mt-1">
              Preencha os campos abaixo para {id === 'new' ? 'criar' : 'atualizar'} o conteúdo.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/noticias')}
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
            <label className="text-[13px] font-semibold text-slate-700">Título da Notícia</label>
            <input 
              id="field-titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-resumo')?.focus(); } }}
              className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              placeholder="Digite o título..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Resumo / Linha Fina</label>
            <textarea 
              id="field-resumo"
              value={formData.resumo}
              onChange={(e) => setFormData({ ...formData, resumo: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('field-autor')?.focus(); } }}
              className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors min-h-[80px] resize-y"
              placeholder="Digite o resumo da publicação..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Autor</label>
              <input 
                id="field-autor"
                value={formData.autor}
                onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-data')?.focus(); } }}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
                placeholder="Ex: Redação"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Data de Publicação</label>
              <input 
                id="field-data"
                type="date"
                value={formData.data_publicacao}
                onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-categoria')?.focus(); } }}
                className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Categoria</label>
            <div className="flex gap-2">
              <select
                id="field-categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="flex-1 bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
              >
                <option value="">Selecione uma categoria...</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3 py-2 border border-slate-300 rounded-md bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                title="Nova Categoria"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col">
            <label className="text-[13px] font-semibold text-slate-700">Conteúdo Completo</label>
            <div className="border border-slate-300 rounded-md flex-1 min-h-[400px] flex flex-col focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors overflow-hidden">
              <RichTextEditor 
                content={formData.conteudo}
                onChange={(html) => setFormData({ ...formData, conteudo: html })}
              />
            </div>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-border-color rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 block">Status da Publicação</label>
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

            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 block">Imagem de Capa</label>
              
              <input 
                type="file"
                id="image-upload"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />

              {formData.imagem_url ? (
                <div className="relative w-full h-40 rounded-md overflow-hidden group border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.imagem_url} alt="Capa" className="w-full h-full object-cover" />
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
                      <Loader2 className="animate-spin text-blue-500" size={24} />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                    <button 
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="px-3 py-1.5 bg-white rounded-md text-[12px] font-medium text-slate-700 flex items-center gap-2 hover:bg-slate-50"
                    >
                      <UploadCloud size={14} /> Trocar Imagem
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, imagem_url: '' })}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-md text-[12px] font-medium flex items-center gap-2 hover:bg-red-600"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                  ) : (
                    <>
                      <UploadCloud size={24} className="text-slate-400" />
                      <span className="text-[12px] font-medium text-slate-500 text-center px-4">Clique para enviar a imagem de capa</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {id !== 'new' && (
            <div className="bg-white border border-border-color rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
              <h3 className="text-[13px] font-semibold text-slate-700 m-0 pb-3 border-b border-slate-100">Informações Adicionais</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-medium">ID do Registro</span>
                  <span className="font-mono text-slate-900">{id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-slate-500 font-medium">Visualizações</span>
                  <span className="text-slate-900 font-semibold">{noticia?.views || 0}</span>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleDelete}
                  className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-md text-[13px] font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={15} />
                  Excluir Registro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ── Modal de Nova Categoria ────────────────────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 m-0">Nova Categoria</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700">Nome da Categoria</label>
                <input 
                  autoFocus
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategory.trim()) {
                      setAvailableCategories(prev => [...prev, newCategory.trim()]);
                      setFormData(prev => ({ ...prev, categoria: newCategory.trim() }));
                      setNewCategory('');
                      setIsCategoryModalOpen(false);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-[14px] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Ex: Esportes"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-md text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (newCategory.trim()) {
                    setAvailableCategories(prev => [...prev, newCategory.trim()]);
                    setFormData(prev => ({ ...prev, categoria: newCategory.trim() }));
                    setNewCategory('');
                    setIsCategoryModalOpen(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-[13px] font-medium hover:bg-blue-700"
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
