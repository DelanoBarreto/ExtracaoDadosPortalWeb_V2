'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Save, Calendar, FileText, Loader2, UploadCloud, ChevronDown, Plus, X, Trash2, Globe, ArrowUpDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useMunicipalityStore } from '@/store/municipality';
import { useUiStore } from '@/store/ui';
import { supabase } from '@/lib/supabase';

export default function EditLRFPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { currentMunicipality } = useMunicipalityStore();
  const { setSidebarLocked } = useUiStore();
  const id = params.id;
  const isNavigatingAway = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [initialDataStr, setInitialDataStr] = useState<string | null>(null);

  const handleSort = () => {
    const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(nextOrder);
    
    const sorted = [...formData.anexos].sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return nextOrder === 'asc' 
        ? titleA.localeCompare(titleB) 
        : titleB.localeCompare(titleA);
    });
    
    setFormData(prev => ({ ...prev, anexos: sorted }));
  };

  // Estados para CRUD de Tipos e Competências (serão preenchidos pelo useEffect)
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [availableCompetencias, setAvailableCompetencias] = useState<string[]>([]);
  const [isCompetenciaModalOpen, setIsCompetenciaModalOpen] = useState(false);
  const [newCompetencia, setNewCompetencia] = useState('');

  const [formData, setFormData] = useState({
    titulo: '',
    categoria_lrf: '',
    exercicio: new Date().getFullYear().toString(),
    data_publicacao: '',
    competencia: '',
    status: 'rascunho',
    url_arquivo: '',
    url_original: '',
    anexos: [] as any[]
  });

  // Busca opções existentes no banco de dados (Smart Discovery)
  const { data: dbOptions } = useQuery({
    queryKey: ['lrf-options', currentMunicipality?.id],
    queryFn: async () => {
      if (!currentMunicipality?.id) return { tipos: [], competencias: [] };
      const { data } = await axios.get(`/api/admin/lrf/options?municipio_id=${currentMunicipality.id}`);
      return data;
    },
    enabled: !!currentMunicipality?.id
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ['lrf', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/lrf/${id}`);
      return data;
    },
    enabled: !!id && id !== 'new'
  });

  // Efeito para mesclar opções do banco com os padrões
  useEffect(() => {
    const defaultCategories = [
      'LDO - LEI DE DIRETRIZES ORÇAMENTÁRIAS', 'LOA - LEI ORÇAMENTÁRIA ANUAL', 'PPA - PLANO PLURIANUAL', 'RGF - RELATÓRIO DE GESTÃO FISCAL', 'RREO - RELATÓRIO RESUMIDO DE EXECUÇÃO ORÇAMENTÁRIA'
    ];
    
    const typeMapping: Record<string, string> = {
      'LDO': 'LDO - LEI DE DIRETRIZES ORÇAMENTÁRIAS',
      'LOA': 'LOA - LEI ORÇAMENTÁRIA ANUAL',
      'PPA': 'PPA - PLANO PLURIANUAL',
      'RGF': 'RGF - RELATÓRIO DE GESTÃO FISCAL',
      'RREO': 'RREO - RELATÓRIO RESUMIDO DE EXECUÇÃO ORÇAMENTÁRIA'
    };

    const dbTiposMapped = (dbOptions?.tipos || []).map((t: string) => typeMapping[t] || t);
    const combinedCategories = Array.from(new Set([...defaultCategories, ...dbTiposMapped]));
    setAvailableCategories(combinedCategories);

    const defaultCompetencias = [
      'ANUAL', '1º QUADRIMESTRE', '2º QUADRIMESTRE', '3º QUADRIMESTRE', '1º BIMESTRE', '2º BIMESTRE', '3º BIMESTRE', '4º BIMESTRE', '5º BIMESTRE', '6º BIMESTRE', '1º SEMESTRE', '2º SEMESTRE'
    ];
    const combinedCompetencias = Array.from(new Set([...defaultCompetencias, ...(dbOptions?.competencias || [])]));
    setAvailableCompetencias(combinedCompetencias);
  }, [dbOptions]);

  useEffect(() => {
    if (item) {
      // Mapeamento de siglas → nomes extensos (exibição no formulário)
      const typeMapping: Record<string, string> = {
        'LDO': 'LDO - LEI DE DIRETRIZES ORÇAMENTÁRIAS',
        'LOA': 'LOA - LEI ORÇAMENTÁRIA ANUAL',
        'PPA': 'PPA - PLANO PLURIANUAL',
        'RGF': 'RGF - RELATÓRIO DE GESTÃO FISCAL',
        'RREO': 'RREO - RELATÓRIO RESUMIDO DE EXECUÇÃO ORÇAMENTÁRIA'
      };

      const tipoOriginal = item.tipo || item.categoria_lrf || '';
      const tipoMapeado = typeMapping[tipoOriginal] || tipoOriginal;

      const competenciaDb = item.competencia || '';

      const legacyUrl = item.arquivo_url || item.url_arquivo || '';
      
      let mappedAnexos = Array.isArray(item.anexos) 
        ? [...item.anexos].map((a: any) => ({
            title: a.title || a.titulo || '',
            storageUrl: a.storageUrl || a.url || ''
          }))
        : [];

      // Migração visual: se houver arquivo legado e ele não estiver na lista, adiciona como "Documento Principal"
      if (legacyUrl && !mappedAnexos.some(a => a.storageUrl === legacyUrl)) {
        mappedAnexos.push({ title: 'Documento Principal', storageUrl: legacyUrl });
      }

      const mappedData = {
        titulo: item.titulo || '',
        categoria_lrf: tipoMapeado,
        exercicio: item.ano?.toString() || item.exercicio || new Date().getFullYear().toString(),
        data_publicacao: item.data_publicacao ? item.data_publicacao.substring(0, 10) : '',
        competencia: competenciaDb,
        status: (item.status || 'rascunho').toLowerCase(),
        url_arquivo: legacyUrl,
        url_original: item.url_original || '',
        anexos: mappedAnexos.sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
      };

      setFormData(mappedData);
      setInitialDataStr(JSON.stringify(mappedData));
      setIsDirty(false);
      
      setSortOrder('asc');
    }
  }, [item]);

  useEffect(() => {
    if (initialDataStr && JSON.stringify(formData) !== initialDataStr) {
      setIsDirty(true);
    }
  }, [formData, initialDataStr]);

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
      if (!isNavigatingAway.current) {
         setSidebarLocked(false);
      }
    };
  }, [isDirty, setSidebarLocked]);

  const handleBack = () => {
    if (!isDirty) {
      isNavigatingAway.current = true;
      setSidebarLocked(false);
      router.push('/lrf');
    }
  };

  const handleCancel = () => {
    isNavigatingAway.current = true;
    setSidebarLocked(false);
    router.push('/lrf');
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mapeamento inverso: nome extenso → sigla para salvar no banco
      const reverseTypeMapping: Record<string, string> = {
        'LDO - LEI DE DIRETRIZES ORÇAMENTÁRIAS': 'LDO',
        'LOA - LEI ORÇAMENTÁRIA ANUAL': 'LOA',
        'PPA - PLANO PLURIANUAL': 'PPA',
        'RGF - RELATÓRIO DE GESTÃO FISCAL': 'RGF',
        'RREO - RELATÓRIO RESUMIDO DE EXECUÇÃO ORÇAMENTÁRIA': 'RREO'
      };
      const tipoParaSalvar = reverseTypeMapping[data.categoria_lrf] || data.categoria_lrf;

      const payload = {
        titulo: data.titulo,
        tipo: tipoParaSalvar,
        ano: parseInt(data.exercicio) || null,
        data_publicacao: data.data_publicacao || null,
        competencia: data.competencia,
        status: data.status,
        arquivo_url: data.url_arquivo,
        url_original: data.url_original || data.url_arquivo || '', // Satisfaz restrição NOT NULL para cadastros manuais
        // Converte de volta do estado da UI (title/storageUrl) para o padrão do banco (titulo/url)
        anexos: data.anexos?.map((a: any) => ({
          titulo: a.title || a.titulo,
          url: a.storageUrl || a.url
        })) || [],
        municipio_id: currentMunicipality?.id
      };
      if (id === 'new') return axios.post('/api/lrf', payload);
      return axios.put(`/api/lrf/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lrf'] });
      queryClient.invalidateQueries({ queryKey: ['lrf-options'] });
      queryClient.invalidateQueries({ queryKey: ['lrf-counts'] });
      queryClient.removeQueries({ queryKey: ['lrf', id] });
      setIsDirty(false);
      setSidebarLocked(false);
      router.push('/lrf');
    },
    onError: (error: any) => {
      alert('Erro ao salvar: ' + (error.response?.data?.error || error.message));
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx?: number) => {
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
      const filePath = `${currentMunicipality.name}/LRF/${fileName}`;

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('path', filePath);
      uploadFormData.append('bucket', 'arquivos_municipais');

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao enviar o arquivo');
      }

      if (idx !== undefined) {
        // Atualiza a URL do anexo específico
        const novos = [...formData.anexos];
        novos[idx].storageUrl = data.publicUrl;
        setFormData(prev => ({ ...prev, anexos: novos }));
      } else {
        // Fallback: Atualiza a URL principal do documento
        setFormData(prev => ({ ...prev, url_arquivo: data.publicUrl }));
      }
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

  const handleEnter = (e: React.KeyboardEvent, nextFieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextEl = document.getElementById(nextFieldId);
      if (nextEl) nextEl.focus();
    }
  };

  if (isLoading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-city-hall-blue" size={32} /></div>;

  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* Header Fixo */}
      <header className="px-8 pt-6 pb-4 bg-white flex items-center justify-between border-b border-slate-200 mb-6 mx-[-32px] mt-[-32px] sticky top-0 z-10 shadow-sm">
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
              {id === 'new' ? 'Novo Documento LRF' : 'Editar Documento'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[12px] text-slate-500 font-medium">Configuração de prestação de contas</p>
              {isDirty && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Não salvo</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleCancel}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <X size={16} /> Cancelar
          </button>
          <button 
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending || (!isDirty && id !== 'new')}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
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
                  onKeyDown={(e) => handleEnter(e, 'field-tipo')}
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
                      id="field-tipo"
                      value={formData.categoria_lrf}
                      onChange={handleCategorySelect}
                      onKeyDown={(e) => handleEnter(e, 'field-competencia')}
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
                      id="field-competencia"
                      value={formData.competencia}
                      onChange={handleCompetenciaSelect}
                      onKeyDown={(e) => handleEnter(e, 'field-exercicio')}
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

              {/* Tabela de Arquivos Anexos (JSONB) */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-semibold text-slate-700 block m-0">Arquivos Anexados</label>
                  <button
                    onClick={() => {
                      const novoAnexo = { title: 'Novo Arquivo', storageUrl: '' };
                      setFormData({ ...formData, anexos: [...formData.anexos, novoAnexo] });
                    }}
                    className="flex items-center gap-1 text-[12px] font-medium text-city-hall-blue hover:text-city-hall-blue/80"
                  >
                    <Plus size={14} /> Adicionar Arquivo
                  </button>
                </div>
                
                {formData.anexos.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-[13px]">
                    Nenhum arquivo associado a este registro. Clique em Adicionar Arquivo.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                          <th 
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                            onClick={handleSort}
                          >
                            <div className="flex items-center gap-2">
                              Título / Descrição
                              <ArrowUpDown size={14} className={`transition-colors ${sortOrder ? 'text-city-hall-blue' : 'text-slate-300 group-hover:text-slate-400'}`} />
                            </div>
                          </th>
                          <th className="px-4 py-3 w-[150px]">Arquivo</th>
                          <th className="px-4 py-3 text-right w-[120px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.anexos.map((anexo, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 group transition-colors">
                            <td className="px-4 py-3">
                              <input 
                                value={anexo.title} 
                                onChange={(e) => {
                                  const novos = [...formData.anexos];
                                  novos[idx].title = e.target.value;
                                  setFormData({ ...formData, anexos: novos });
                                }}
                                className="w-full bg-transparent border-b border-transparent focus:border-city-hall-blue outline-none py-1.5 font-medium text-slate-700"
                                placeholder="Nome ou descrição do arquivo"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="file" 
                                  accept=".pdf,application/pdf" 
                                  className="hidden" 
                                  id={`pdf-upload-${idx}`} 
                                  onChange={(e) => handleFileUpload(e, idx)} 
                                  disabled={isUploading}
                                />
                                <label 
                                  htmlFor={`pdf-upload-${idx}`}
                                  className={`w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                  {isUploading ? (
                                    <><Loader2 size={14} className="animate-spin" /> ...</>
                                  ) : (
                                    <><UploadCloud size={14} /> Alterar</>
                                  )}
                                </label>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {anexo.storageUrl && (
                                  <a 
                                    href={anexo.storageUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors border border-transparent hover:border-emerald-200"
                                    title="Visualizar PDF"
                                  >
                                    <Globe size={16} />
                                  </a>
                                )}
                                <button
                                  onClick={() => {
                                    const novos = [...formData.anexos];
                                    novos.splice(idx, 1);
                                    setFormData({ ...formData, anexos: novos });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-200"
                                  title="Remover arquivo"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                    id="field-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveMutation.mutate(formData);
                      }
                    }}
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
                    onKeyDown={(e) => handleEnter(e, 'field-data-publicacao')}
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
                      id="field-data-publicacao"
                      value={formData.data_publicacao} 
                      onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })} 
                      onKeyDown={(e) => handleEnter(e, 'field-status')}
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
