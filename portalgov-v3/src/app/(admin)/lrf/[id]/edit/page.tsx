'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Calendar, FileText, Loader2, UploadCloud, ChevronDown, Plus, X, Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useMunicipalityStore } from '@/store/municipality';
import { supabase } from '@/lib/supabase';

export default function EditLRFPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { currentMunicipality } = useMunicipalityStore();
  const id = params.id;
  const [isUploading, setIsUploading] = useState(false);

  // Estados para CRUD de Tipos e Competências
  const [availableCategories, setAvailableCategories] = useState([
    'LDO - LEI DE DIRETRIZES ORÇAMENTÁRIAS', 'LOA - LEI ORÇAMENTÁRIA ANUAL', 'PPA - PLANO PLURIANUAL', 'RGF - RELATÓRIO DE GESTÃO FISCAL', 'RREO - RELATÓRIO RESUMIDO DE EXECUÇÃO ORÇAMENTÁRIA'
  ]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [availableCompetencias, setAvailableCompetencias] = useState([
    'ANUAL', '1º QUADRIMESTRE', '2º QUADRIMESTRE', '3º QUADRIMESTRE', '1º BIMESTRE', '2º BIMESTRE', '3º BIMESTRE', '4º BIMESTRE', '5º BIMESTRE', '6º BIMESTRE', '1º SEMESTRE', '2º SEMESTRE'
  ]);
  const [isCompetenciaModalOpen, setIsCompetenciaModalOpen] = useState(false);
  const [newCompetencia, setNewCompetencia] = useState('');

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentMunicipality?.id) {
      alert("Nenhum município selecionado no contexto.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `arquivos_municipais/${currentMunicipality.id}/lrf/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('PortalGov')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('PortalGov')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, url_arquivo: publicUrl }));
    } catch (error: any) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar o arquivo: " + error.message);
    } finally {
      setIsUploading(false);
      // reset the input
      e.target.value = '';
    }
  };

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '_manage') {
      setIsCategoryModalOpen(true);
      e.target.value = formData.categoria_lrf; // Revert selection
    } else {
      setFormData({ ...formData, categoria_lrf: e.target.value });
    }
  };

  const handleCompetenciaSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '_manage') {
      setIsCompetenciaModalOpen(true);
      e.target.value = formData.competencia; // Revert selection
    } else {
      setFormData({ ...formData, competencia: e.target.value });
    }
  };

  if (isLoading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-city-hall-blue" size={32} /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 p-8 pt-6 pb-12 mx-[-32px] mt-[-32px]">
      {/* ── Main Header ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/lrf')}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-slate-200 text-slate-600 transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-city-hall-blue tracking-tight m-0 leading-none flex items-center gap-2">
              {id === 'new' ? 'Novo Documento' : 'Editar Documento'}
            </h2>
            <div className="text-[13px] text-slate-500 mt-1">
              Modifique os dados do arquivo da LRF
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/lrf')}
            className="px-4 py-2 border border-slate-200 bg-white rounded-md text-[13px] font-semibold text-text-primary hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={() => saveMutation.mutate(formData)}
            className="px-4 py-2 bg-city-hall-blue text-white rounded-md text-[13px] font-medium hover:bg-city-hall-blue/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save size={15} />
            Salvar Alterações
          </button>
        </div>
      </header>

      {/* ── Grid Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-[15px] font-bold text-city-hall-blue m-0">Informações do Documento</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Título do Documento</label>
                <input 
                  id="field-titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 focus:ring-city-hall-blue transition-colors"
                  placeholder="Ex: LDO - LEI DE DIRETRIZES ORÇAMENTÁRIAS"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Tipo de Relatório</label>
                  <div className="relative">
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select 
                      value={formData.categoria_lrf}
                      onChange={handleCategorySelect}
                      className="w-full bg-white border border-slate-200 rounded-md pl-3 pr-8 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 focus:ring-city-hall-blue transition-colors appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="_manage" className="text-city-hall-blue font-semibold">+ Gerenciar Tipos</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Competência / Período</label>
                  <div className="relative">
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select 
                      value={formData.competencia}
                      onChange={handleCompetenciaSelect}
                      className="w-full bg-white border border-slate-200 rounded-md pl-3 pr-8 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 focus:ring-city-hall-blue transition-colors appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {availableCompetencias.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                      <option value="_manage" className="text-city-hall-blue font-semibold">+ Gerenciar Competências</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Documento (Anexo) moved inside main content */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <label className="text-[13px] font-semibold text-slate-700 block mb-3">Documento (Anexo)</label>
                <div className="w-full border border-slate-200 rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm bg-slate-50/50">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-medium text-slate-700 truncate">{formData.url_arquivo ? 'Arquivo Anexado' : 'Nenhum arquivo'}</span>
                      {formData.url_arquivo ? (
                        <a href={formData.url_arquivo} target="_blank" rel="noreferrer" className="text-[12px] text-city-hall-blue hover:underline mt-0.5">
                          Visualizar PDF
                        </a>
                      ) : (
                        <span className="text-[12px] text-slate-400 mt-0.5">Nenhum anexo encontrado</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto flex-shrink-0">
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf" 
                      className="hidden" 
                      id="pdf-upload" 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                    />
                    <label 
                      htmlFor="pdf-upload"
                      className={`w-full md:w-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[13px] font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                      {isUploading ? (
                        <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                      ) : (
                        <><UploadCloud size={14} /> Alterar Arquivo</>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Metadata */}
        <div className="flex flex-col gap-6">
          {/* Configurações */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-[15px] font-bold text-city-hall-blue m-0">Configurações</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Status de Publicação</label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none ${formData.status === 'rascunho' ? 'bg-amber-400' : formData.status === 'publicado' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md pl-8 pr-8 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 focus:ring-city-hall-blue transition-colors appearance-none"
                  >
                    <option value="rascunho">Rascunho (Privado)</option>
                    <option value="publicado">Publicado (Público)</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Exercício (Ano)</label>
                  <input 
                    type="number"
                    id="field-exercicio"
                    value={formData.exercicio}
                    onChange={(e) => setFormData({ ...formData, exercicio: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 focus:ring-city-hall-blue transition-colors"
                    placeholder="2026"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Publicação</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      type="date" 
                      value={formData.data} 
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-md pl-3 pr-8 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 focus:ring-city-hall-blue transition-colors appearance-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">ID Banco:</span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                  {id === 'new' ? 'NOVO' : id}
                </span>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ── Modals Gerenciamento Tipos / Competências ────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">Gerenciar Tipos de Relatório</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <div className="flex gap-2 mb-6">
                <input 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Novo tipo..."
                  className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 transition-colors"
                />
                <button 
                  onClick={() => {
                    if (newCategory.trim() && !availableCategories.includes(newCategory.trim())) {
                      setAvailableCategories([...availableCategories, newCategory.trim()]);
                      setNewCategory('');
                    }
                  }}
                  className="px-3 bg-city-hall-blue text-white rounded-md hover:bg-city-hall-blue/90 transition-colors flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {availableCategories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-md group">
                    <span className="text-[13px] text-slate-700">{cat}</span>
                    <button 
                      onClick={() => setAvailableCategories(availableCategories.filter(c => c !== cat))}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCompetenciaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">Gerenciar Competências</h3>
              <button onClick={() => setIsCompetenciaModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <div className="flex gap-2 mb-6">
                <input 
                  value={newCompetencia}
                  onChange={(e) => setNewCompetencia(e.target.value)}
                  placeholder="Nova competência..."
                  className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-city-hall-blue focus:ring-1 transition-colors"
                />
                <button 
                  onClick={() => {
                    if (newCompetencia.trim() && !availableCompetencias.includes(newCompetencia.trim())) {
                      setAvailableCompetencias([...availableCompetencias, newCompetencia.trim()]);
                      setNewCompetencia('');
                    }
                  }}
                  className="px-3 bg-city-hall-blue text-white rounded-md hover:bg-city-hall-blue/90 transition-colors flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {availableCompetencias.map(comp => (
                  <div key={comp} className="flex items-center justify-between p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-md group">
                    <span className="text-[13px] text-slate-700">{comp}</span>
                    <button 
                      onClick={() => setAvailableCompetencias(availableCompetencias.filter(c => c !== comp))}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
