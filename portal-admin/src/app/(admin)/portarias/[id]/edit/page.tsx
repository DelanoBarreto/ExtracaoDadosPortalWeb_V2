"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, Trash2, UploadCloud, Loader2, X, FileText, ExternalLink, Globe, ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useMunicipalityStore } from '@/store/municipality';
import { useUiStore } from '@/store/ui';

export default function EditPortariaPage() {
  const router = useRouter();
  const params = useParams();
  const { currentMunicipality } = useMunicipalityStore();
  const { setSidebarLocked } = useUiStore();
  const queryClient = useQueryClient();
  const id = params?.id || 'new';

  const [formData, setFormData] = useState({
    numero: '',
    data_portaria: '',
    ano: new Date().getFullYear(),
    tipo: '',
    agente: '',
    cargo: '',
    secretaria: '',
    detalhamento: '',
    arquivo_url: '',
    status: 'rascunho',
    municipio_id: ''
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Ref para verificar se estamos desmontando intencionalmente
  const isNavigatingAway = useRef(false);

  const { data: portaria, isLoading } = useQuery({
    queryKey: ['portaria', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/portarias/${id}`);
      return data;
    },
    enabled: !!id && id !== 'new'
  });

  useEffect(() => {
    if (portaria) {
      setFormData({
        ...portaria,
        data_portaria: portaria.data_portaria || '',
        ano: portaria.ano || new Date().getFullYear(),
        tipo: portaria.tipo || '',
        agente: portaria.agente || '',
        cargo: portaria.cargo || '',
        secretaria: portaria.secretaria || '',
        detalhamento: portaria.detalhamento || '',
        arquivo_url: portaria.arquivo_url || '',
        status: portaria.status || 'rascunho',
      });
      setIsDirty(false);
      setSidebarLocked(false);
    } else if (currentMunicipality) {
      setFormData(prev => ({ ...prev, municipio_id: currentMunicipality.id }));
    }
  }, [portaria, currentMunicipality]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSidebarLocked(true); // Bloqueia a sidebar assim que houver edição
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id === 'new') {
        return axios.post('/api/portarias', data);
      }
      return axios.patch(`/api/portarias/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portarias'] });
      queryClient.invalidateQueries({ queryKey: ['portarias-counts'] });
      queryClient.removeQueries({ queryKey: ['portaria', id] });
      setIsDirty(false);
      setSidebarLocked(false);
      router.push('/portarias');
    },
  });

  // Tratar botão de Voltar
  const handleBack = () => {
    if (!isDirty) {
      isNavigatingAway.current = true;
      setSidebarLocked(false);
      router.push('/portarias');
    }
  };

  // Tratar Cancelar (sai sem salvar)
  const handleCancel = () => {
    isNavigatingAway.current = true;
    setSidebarLocked(false);
    router.push('/portarias');
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
      // Cleanup de segurança caso o componente desmonte de outra forma
      if (!isNavigatingAway.current) {
         setSidebarLocked(false);
      }
    };
  }, [isDirty, setSidebarLocked]);

  // Navegação com Enter
  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, nextFieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextEl = document.getElementById(nextFieldId);
      if (nextEl) nextEl.focus();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMunicipality) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${currentMunicipality.nome || currentMunicipality.name}/portarias/${fileName}`;

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

      handleChange('arquivo_url', data.publicUrl);
    } catch (error: any) {
      alert("Erro ao enviar arquivo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading && id !== 'new') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-20 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Carregando portaria...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Fixo */}
      <header className="px-8 pt-6 pb-4 bg-white flex items-center justify-between border-b border-slate-200 mb-6 mx-[-32px] mt-[-32px] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack} 
            disabled={isDirty}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center w-9 h-9 ${isDirty ? 'text-slate-300 cursor-not-allowed opacity-50' : 'hover:bg-slate-100 text-slate-500 border border-transparent hover:border-slate-200'}`}
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-none">
              {id === 'new' ? 'Nova Portaria' : 'Editar Portaria'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[12px] text-slate-500 font-medium">Configuração de ato administrativo</p>
              {isDirty && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Não salvo</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="px-4 py-2 border border-slate-200 bg-white rounded-md text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            Cancelar
          </button>
          <button 
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending || (!isDirty && id !== 'new')}
            className="px-4 py-2 bg-[#004c99] text-white rounded-md text-[13px] font-medium hover:bg-[#003366] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar Alterações
          </button>
        </div>
      </header>

      {/* Grid Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        
        {/* Coluna Principal: Formulário */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-[15px] font-bold text-[#004c99] m-0">Informações da Portaria</h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Número da Portaria</label>
                  <input 
                    id="field-numero"
                    tabIndex={1}
                    value={formData.numero}
                    onChange={e => handleChange('numero', e.target.value)}
                    onKeyDown={(e) => handleEnter(e, 'field-tipo')}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors"
                    placeholder="Ex: 001.01.05/2026"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Tipo</label>
                  <input 
                    id="field-tipo"
                    tabIndex={2}
                    value={formData.tipo}
                    onChange={e => handleChange('tipo', e.target.value)}
                    onKeyDown={(e) => handleEnter(e, 'field-secretaria')}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors"
                    placeholder="Ex: NOMEAÇÃO, APROVAR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Secretaria</label>
                  <input 
                    id="field-secretaria"
                    tabIndex={3}
                    value={formData.secretaria}
                    onChange={e => handleChange('secretaria', e.target.value)}
                    onKeyDown={(e) => handleEnter(e, 'field-data')}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors"
                    placeholder="Ex: Secretaria de Saúde"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Data</label>
                    <input 
                      id="field-data"
                      tabIndex={4}
                      type="date"
                      value={formData.data_portaria}
                      onChange={e => {
                        const data = e.target.value;
                        const ano = data ? new Date(data).getFullYear() : formData.ano;
                        setFormData(prev => ({ ...prev, data_portaria: data, ano }));
                        setIsDirty(true);
                        setSidebarLocked(true);
                      }}
                      onKeyDown={(e) => handleEnter(e, 'field-ano')}
                      className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Ano</label>
                    <input 
                      id="field-ano"
                      tabIndex={5}
                      type="number"
                      value={formData.ano || ''}
                      onChange={e => handleChange('ano', parseInt(e.target.value))}
                      onKeyDown={(e) => handleEnter(e, 'field-agente')}
                      className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Agente (Opcional)</label>
                  <input 
                    id="field-agente"
                    tabIndex={6}
                    value={formData.agente}
                    onChange={e => handleChange('agente', e.target.value)}
                    onKeyDown={(e) => handleEnter(e, 'field-cargo')}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors"
                    placeholder="Nome do servidor"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Cargo (Opcional)</label>
                  <input 
                    id="field-cargo"
                    tabIndex={7}
                    value={formData.cargo}
                    onChange={e => handleChange('cargo', e.target.value)}
                    onKeyDown={(e) => handleEnter(e, 'field-detalhamento')}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors"
                    placeholder="Cargo a assumir"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Detalhamento / Descrição</label>
                <textarea 
                  id="field-detalhamento"
                  tabIndex={8}
                  value={formData.detalhamento}
                  onChange={e => handleChange('detalhamento', e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors resize-none"
                  placeholder="Descreva o conteúdo da portaria..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Configurações & Arquivo */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-[15px] font-bold text-[#004c99] m-0">Configurações</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Status de Publicação</label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none ${formData.status === 'rascunho' ? 'bg-amber-400' : formData.status === 'publicado' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                    id="field-status"
                    tabIndex={9}
                    value={formData.status}
                    onChange={e => handleChange('status', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md pl-8 pr-8 py-2 text-[13px] font-bold text-slate-700 outline-none focus:border-[#004c99] focus:ring-1 focus:ring-[#004c99] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="publicado">Publicado</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-slate-100 mt-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ID Banco:</span>
                <span className="font-mono text-[11px] font-semibold text-slate-500 truncate max-w-[120px]">
                  {id === 'new' ? 'NOVO' : id}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-[15px] font-bold text-[#004c99] m-0">Documento PDF</h3>
            </div>
            <div className="p-6">
              <input type="file" id="pdf-upload" className="hidden" accept="application/pdf" onChange={handleFileUpload} />

              {formData.arquivo_url ? (
                <div className="space-y-4">
                  <div className="aspect-[4/3] w-full bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center group relative overflow-hidden transition-all hover:border-[#004c99]">
                    <FileText size={48} className="text-red-400 mb-4" />
                    <p className="text-[13px] font-bold text-slate-700 truncate w-full px-2">Documento Vinculado</p>
                    
                    <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 p-6 backdrop-blur-sm">
                      <a 
                        href={formData.arquivo_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full py-2 bg-white text-slate-900 rounded-md text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm transition-colors"
                      >
                        <ExternalLink size={14} /> Visualizar PDF
                      </a>
                      <button 
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                        className="w-full py-2 bg-[#004c99] text-white rounded-md text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-[#003366] shadow-sm transition-colors"
                      >
                        <UploadCloud size={14} /> Substituir
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                  className="aspect-[4/3] w-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-50 hover:border-[#004c99] transition-all group"
                >
                  {isUploading ? (
                    <Loader2 size={32} className="text-[#004c99] animate-spin" />
                  ) : (
                    <>
                      <UploadCloud size={32} className="text-slate-300 mb-3 group-hover:text-[#004c99] transition-colors" />
                      <p className="text-[13px] font-bold text-slate-600">Fazer Upload do PDF</p>
                      <p className="text-[11px] text-slate-400 mt-1">Clique para procurar o arquivo</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

