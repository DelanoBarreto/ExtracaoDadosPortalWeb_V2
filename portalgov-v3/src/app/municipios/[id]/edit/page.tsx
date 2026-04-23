'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Check, ChevronRight, Hash, 
  UploadCloud, Settings, Trash2, Globe, Palette, 
  Share2, Activity
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function EditMunicipioPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id;

  const [formData, setFormData] = useState({
    nome: '',
    slug: '',
    cor_primaria: '#4B9C8E',
    logo_url: '',
    brasao_url: '',
    facebook_url: '',
    instagram_url: '',
    status: 'ativo'
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ['municipio', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/municipios/${id}`);
      return data;
    },
    enabled: !!id && id !== 'new'
  });

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome || '',
        slug: item.slug || '',
        cor_primaria: item.cor_primaria || '#4B9C8E',
        logo_url: item.logo_url || '',
        brasao_url: item.brasao_url || '',
        facebook_url: item.facebook_url || '',
        instagram_url: item.instagram_url || '',
        status: item.status || 'ativo'
      });
    }
  }, [item]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id === 'new') return axios.post('/api/municipios', data);
      return axios.put(`/api/municipios/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tab_municipios'] });
      router.push('/municipios');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return axios.delete(`/api/municipios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tab_municipios'] });
      router.push('/municipios');
    }
  });

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este município? Esta ação é irreversível.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <div className="p-8">Carregando Identidade...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-bg-main p-8">
      {/* ── Action Header ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/municipios')}
            className="w-10 h-10 flex items-center justify-center rounded-md border border-border-color bg-white text-text-primary hover:bg-gray-50 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-city-hall-accent uppercase tracking-widest">Infraestrutura</span>
              <ChevronRight size={12} className="text-gray-300" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Configuração</span>
            </div>
            <h1 className="text-2xl font-bold text-city-hall-blue tracking-tight">
              {id === 'new' ? 'Novo Município' : 'Editar Município'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/municipios')}
            className="px-4 py-2 text-[13px] font-semibold text-text-primary hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => saveMutation.mutate(formData)}
            className="px-6 py-2 bg-city-hall-accent text-white rounded-md text-[13px] font-medium hover:bg-city-hall-blue transition-colors flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <Save size={16} /> Salvar Alterações
          </button>
        </div>
      </header>

      {/* ── Grid Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 max-w-[1440px]">
        {/* Main Content */}
        <div className="space-y-12">
          {/* Seção 01: Localidade */}
          <section className="bg-white p-6 rounded-lg border border-border-color shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
            <div className="flex items-center gap-3 border-b border-border-color pb-4">
              <div className="w-8 h-8 rounded-md bg-city-hall-blue/10 flex items-center justify-center text-city-hall-blue">
                <Globe size={18} />
              </div>
              <h2 className="text-base font-bold text-city-hall-blue tracking-tight">Parâmetros de Rede</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-text-primary">Nome da Cidade / Jurisdição</label>
                <input 
                  id="field-nome"
                  value={formData.nome} 
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-slug')?.focus(); } }}
                  className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-1 focus:ring-city-hall-accent transition-all" 
                  placeholder="Ex: Aracati" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-text-primary">Identificador (Slug)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-[14px]">/</span>
                  <input 
                    id="field-slug"
                    value={formData.slug} 
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-facebook')?.focus(); } }}
                    className="w-full bg-gray-50 border border-border-color rounded-md pl-7 pr-3 py-2 text-[14px] font-mono text-city-hall-blue outline-none focus:border-city-hall-accent focus:ring-1 focus:ring-city-hall-accent transition-all" 
                    placeholder="aracati" 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Seção 02: Branding */}
          <section className="bg-white p-6 rounded-lg border border-border-color shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
            <div className="flex items-center gap-3 border-b border-border-color pb-4">
              <div className="w-8 h-8 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                <Palette size={18} />
              </div>
              <h2 className="text-base font-bold text-city-hall-blue tracking-tight">Identidade Visual</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-text-primary">Logo do Portal</label>
                <div className="aspect-square bg-gray-50 rounded-lg border border-dashed border-border-color flex flex-col items-center justify-center gap-2 hover:border-city-hall-accent transition-all cursor-pointer group overflow-hidden relative">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <>
                      <UploadCloud size={24} className="text-gray-400 group-hover:text-city-hall-accent transition-colors" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center px-4 leading-tight">PNG / SVG</span>
                    </>
                  )}
                  {formData.logo_url && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">Trocar Logo</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-text-primary">Brasão Municipal</label>
                <div className="aspect-square bg-gray-50 rounded-lg border border-dashed border-border-color flex flex-col items-center justify-center gap-2 hover:border-city-hall-accent transition-all cursor-pointer group overflow-hidden relative">
                  {formData.brasao_url ? (
                    <img src={formData.brasao_url} alt="Brasão" className="w-full h-full object-contain p-2" />
                  ) : (
                    <>
                      <UploadCloud size={24} className="text-gray-400 group-hover:text-city-hall-accent transition-colors" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center px-4 leading-tight">SVG Oficial</span>
                    </>
                  )}
                  {formData.brasao_url && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">Trocar Brasão</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-text-primary">Cor Primária</label>
                <div className="bg-gray-50 rounded-lg border border-border-color p-4 flex flex-col items-center justify-center gap-4 h-[calc(100%-1.75rem)]">
                  <input 
                    type="color" 
                    value={formData.cor_primaria} 
                    onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                    className="w-12 h-12 border border-border-color rounded-md shadow-sm cursor-pointer bg-transparent" 
                  />
                  <input 
                    value={formData.cor_primaria} 
                    onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                    className="w-24 text-center text-[13px] font-mono text-text-primary bg-white border border-border-color rounded-md py-1" 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Seção 03: Social */}
          <section className="bg-white p-6 rounded-lg border border-border-color shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
            <div className="flex items-center gap-3 border-b border-border-color pb-4">
              <div className="w-8 h-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Share2 size={18} />
              </div>
              <h2 className="text-base font-bold text-city-hall-blue tracking-tight">Presença Digital</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-text-primary">Facebook</label>
                <input 
                  id="field-facebook"
                  value={formData.facebook_url} 
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-instagram')?.focus(); } }}
                  className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-1 focus:ring-city-hall-accent transition-all" 
                  placeholder="facebook.com/prefeitura"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-text-primary">Instagram</label>
                <input 
                  id="field-instagram"
                  value={formData.instagram_url} 
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-1 focus:ring-city-hall-accent transition-all" 
                  placeholder="@prefeitura_oficial"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Metadata */}
        <div className="space-y-6">
          <div className="bg-city-hall-blue text-white rounded-lg p-5 shadow-sm">
            <h3 className="text-[13px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-city-hall-accent">
              <Settings size={16} /> Status de Publicação
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-blue-100">Visibilidade</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-[13px] outline-none focus:border-city-hall-accent appearance-none cursor-pointer"
                >
                  <option value="ativo" className="text-text-primary">Online / Operação Total</option>
                  <option value="manutencao" className="text-text-primary">Manutenção</option>
                  <option value="suspenso" className="text-text-primary">Suspenso</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-blue-200">ID</span>
                  <span className="font-mono text-city-hall-accent font-medium">{id === 'new' ? 'AUTO' : id?.toString().slice(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-blue-200">Engine</span>
                  <span className="font-mono">v4.0.0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border border-red-200 rounded-lg space-y-4 bg-red-50">
            <h3 className="text-[12px] font-bold text-red-700 uppercase tracking-widest flex items-center gap-2">
              <Trash2 size={14} /> Zona de Perigo
            </h3>
            <p className="text-[12px] text-red-600/80 leading-relaxed">
              A exclusão removerá todos os registros permanentemente.
            </p>
            <button 
              onClick={handleDelete}
              className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-[13px] font-semibold"
            >
              Excluir Município
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
