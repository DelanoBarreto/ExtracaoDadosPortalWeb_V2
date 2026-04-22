'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Check, 
  ChevronRight,
  Hash,
  UploadCloud,
  Settings,
  Trash2,
  Globe,
  Palette,
  Layout,
  Share2,
  Activity
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

  if (isLoading) return <div className="p-8">Carregando Identidade...</div>;

    return (
    <div className="flex flex-col">
      {/* ── Header Corporativo Elite ────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10 mb-10 border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/municipios')}
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border border-[var(--color-border-soft)] text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all shadow-sm group"
          >
            <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="label-caps !text-[10px] !tracking-[0.2em]">Configurações Estruturais</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="label-caps !text-[10px] !text-[var(--color-primary)] !tracking-[0.2em]">Identidade Federativa</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-[var(--color-ink)] flex items-center gap-4">
              {formData.nome || 'Novo Município'}
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse" />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/municipios')}
            className="px-8 py-4 text-sm font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            Descartar
          </button>
          <button 
            onClick={() => saveMutation.mutate(formData)}
            className="px-10 py-4.5 bg-[var(--color-primary)] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-3 active:scale-95"
          >
            <Save size={20} />
            Salvar Alterações
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Coluna Principal: Fluxo Unificado */}
        <div className="lg:col-span-8 space-y-16">
          
          {/* Seção 01: Definições de Domínio */}
          <section className="space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-glow)] flex items-center justify-center text-[var(--color-primary)]">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--color-ink)] tracking-tight">Dados de Localidade</h2>
                <p className="text-sm font-bold text-slate-400 mt-1">Defina os parâmetros de acesso e nomenclatura oficial</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="label-caps !text-[10px] !text-slate-400">Nome Oficial da Jurisdição</label>
                <input 
                  value={formData.nome} 
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full text-2xl font-black border-b-2 border-slate-100 bg-transparent py-4 focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-slate-200" 
                  placeholder="Ex: Aracati" 
                />
              </div>
              <div className="space-y-3">
                <label className="label-caps !text-[10px] !text-slate-400">Identificador de URL (Slug)</label>
                <div className="relative group">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 font-mono text-xl font-bold">/</span>
                  <input 
                    value={formData.slug} 
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full text-2xl font-mono border-b-2 border-slate-100 bg-transparent py-4 pl-6 focus:border-[var(--color-primary)] outline-none transition-all text-[var(--color-primary)] placeholder:text-slate-200" 
                    placeholder="aracati" 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Seção 02: Branding & Design */}
          <section className="space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Palette size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--color-ink)] tracking-tight">Identidade Visual</h2>
                <p className="text-sm font-bold text-slate-400 mt-1">Gerencie a marca e a presença estética do município</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-4">
                <label className="label-caps !text-[10px] !text-slate-400">Logo do Portal</label>
                <div className="aspect-square bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-glow)] cursor-pointer transition-all group">
                  <UploadCloud size={40} className="text-slate-300 group-hover:text-[var(--color-primary)] transition-colors" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4 leading-relaxed">Arrastar Logo <br/> (PNG/SVG)</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="label-caps !text-[10px] !text-slate-400">Brasão Municipal</label>
                <div className="aspect-square bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-glow)] cursor-pointer transition-all group">
                  <UploadCloud size={40} className="text-slate-300 group-hover:text-[var(--color-primary)] transition-colors" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4 leading-relaxed">Enviar Brasão <br/> Vetorizado</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="label-caps !text-[10px] !text-slate-400">Paleta Primária</label>
                <div className="h-[calc(100%-2.5rem)] flex flex-col justify-center gap-6 p-2">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <input 
                        type="color" 
                        value={formData.cor_primaria} 
                        onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                        className="w-16 h-16 border-4 border-white rounded-3xl shadow-xl cursor-pointer bg-transparent relative z-10" 
                      />
                      <div 
                        className="absolute inset-0 rounded-3xl blur-xl opacity-40" 
                        style={{ backgroundColor: formData.cor_primaria }}
                      />
                    </div>
                    <input 
                      value={formData.cor_primaria} 
                      onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                      className="text-xl font-mono font-black text-[var(--color-ink)] outline-none w-28 border-b-2 border-slate-100 focus:border-[var(--color-primary)] bg-transparent py-2" 
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    Define a cor mestre da interface e elementos interativos.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Seção 03: Presença Digital */}
          <section className="space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Share2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[var(--color-ink)] tracking-tight">Canais Digitais</h2>
                <p className="text-sm font-bold text-slate-400 mt-1">Conecte o portal às redes institucionais</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="label-caps !text-[10px] !text-slate-400">Página Facebook</label>
                <input 
                  value={formData.facebook_url} 
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  className="w-full border-b-2 border-slate-100 bg-transparent py-4 focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm" 
                  placeholder="Ex: facebook.com/prefeitura"
                />
              </div>
              <div className="space-y-3">
                <label className="label-caps !text-[10px] !text-slate-400">Perfil Instagram</label>
                <input 
                  value={formData.instagram_url} 
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  className="w-full border-b-2 border-slate-100 bg-transparent py-4 focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm" 
                  placeholder="Ex: @prefeitura_oficial"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Barra Lateral Unificada */}
        <aside className="lg:col-span-4 space-y-12">
          <div className="bg-[#0f172a] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group border border-slate-800">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,#1d4ed833,transparent_40%)]" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Governança</h3>
                  <p className="text-slate-400 text-[10px] font-bold">Estado do Sistema</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="label-caps !text-[9px] !text-slate-500">Acessibilidade Pública</label>
                  <div className="relative">
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-800/40 border border-slate-700/50 text-white rounded-2xl p-5 focus:border-blue-500 outline-none font-black text-xs appearance-none transition-all"
                    >
                      <option value="ativo" className="bg-[#0f172a]">Online / Operação Total</option>
                      <option value="manutencao" className="bg-[#0f172a]">Modo Manutenção</option>
                      <option value="suspenso" className="bg-[#0f172a]">Jurisdição Suspensa</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight size={16} className="text-slate-600 rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-900/50 rounded-3xl space-y-4 border border-slate-800/50">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Hash size={14} /> Cloud ID
                    </span>
                    <span className="text-blue-400 font-mono text-[10px] font-black">{id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Settings size={14} /> Engine
                    </span>
                    <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">v3.0.4-PRO</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic px-2">
                Alterações de governança impactam imediatamente todos os endpoints de transparência vinculados a esta jurisdição.
              </p>
            </div>
          </div>

          <div className="p-10 border-2 border-red-50/30 rounded-[3rem] space-y-6">
            <h3 className="text-xs font-black text-red-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <Trash2 size={18} className="text-red-500" />
              Zona Crítica
            </h3>
            <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
              A exclusão removerá permanentemente todos os registros, arquivos e metadados desta jurisdição. Esta ação é irreversível.
            </p>
            <button className="w-full py-5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] group active:scale-95 shadow-sm">
              <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
              Remover Município
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
