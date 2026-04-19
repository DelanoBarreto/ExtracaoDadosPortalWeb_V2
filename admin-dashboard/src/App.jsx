import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Newspaper, FileText, RefreshCcw, Trash2,
  ChevronRight, Search, MapPin, Clock, ExternalLink, AlertCircle,
  CheckCircle2, Terminal, FileDown, Building2, Menu, X, Info,
  BarChart3, Database, HardDrive, ChevronDown, Plus, Link,
  Gavel, ScrollText, BookMarked, BookOpen, Globe, Pencil, Eye,
  ArrowUpDown, ArrowUp, ArrowDown, User, Phone, Mail
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

// ─── Module Definitions ──────────────────────────────────────────────────────
const MODULES = [
  { id: 'noticias',    label: 'Notícias',        icon: Newspaper,   apiTable: 'noticias',    ready: true  },
  { id: 'lrf',         label: 'LRF',             icon: FileText,    apiTable: 'lrf',         ready: true  },
  { id: 'secretarias', label: 'Secretarias',     icon: Building2,   apiTable: 'secretarias', ready: true  },
  { id: 'decretos',    label: 'Decretos',        icon: Gavel,       apiTable: null,          ready: false },
  { id: 'leis',        label: 'Leis',            icon: ScrollText,  apiTable: null,          ready: false },
  { id: 'portarias',   label: 'Portarias',       icon: BookMarked,  apiTable: null,          ready: false },
  { id: 'atas',        label: 'Atas de Câmara',  icon: BookOpen,    apiTable: null,          ready: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '–';
  const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = raw.split('-');
  if (parts.length < 3) return raw;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

const getExercicio = (item) => {
  if (item.exercicio) return item.exercicio;
  if (item.ano) return item.ano;
  if (item.data_publicacao) return item.data_publicacao.split('T')[0].split('-')[0];
  return 'N/A';
};

const classifyLog = (line) => {
  if (line.includes('❌') || line.toLowerCase().includes('erro')) return 'error';
  if (line.includes('✅') || line.includes('🏁') || line.toLowerCase().includes('sucesso')) return 'success';
  if (line.includes('🚀')) return 'start';
  return 'info';
};

// ─── Modal Components ─────────────────────────────────────────────────────────

function NewMunicipioModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nome: '', url_base: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.url_base.trim()) {
      setError('Preencha o nome e o URL do portal.');
      return;
    }
    setLoading(true); setError('');
    try {
      const r = await axios.post(`${API_BASE}/municipios`, form);
      onCreated(r.data.municipio);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="badge badge-news" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus size={10} /> Novo Município
            </span>
            <h3>Cadastrar Município</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Nome do Município *</label>
              <input
                type="text"
                placeholder="Ex: Aracati"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">URL do Portal Oficial *</label>
              <div style={{ position: 'relative' }}>
                <Globe size={14} className="input-icon" />
                <input
                  type="url"
                  placeholder="https://www.municipio.ce.gov.br"
                  value={form.url_base}
                  onChange={e => setForm(f => ({ ...f, url_base: e.target.value }))}
                  className="form-input with-icon"
                />
              </div>
            </div>
            {error && <div className="error-alert"><AlertCircle size={14} /> {error}</div>}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <RefreshCcw size={14} className="spin" /> : <Plus size={14} />}
              {loading ? 'Cadastrando...' : 'Cadastrar Município'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EditItemModal ────────────────────────────────────────────────────────────

function EditItemModal({ item, module: mod, onClose, onSave }) {
  const buildInitialForm = () => {
    const formatDateForInput = (val) => {
      if (!val) return '';
      return val.split('T')[0];
    };

    if (mod === 'secretarias') return {
      nome_secretaria:     item.nome_secretaria    || '',
      nome_responsavel:    item.nome_responsavel   || '',
      cargo_responsavel:   item.cargo_responsavel  || '',
      email:               item.email              || '',
      telefone:            item.telefone           || '',
      endereco:            item.endereco           || '',
      horario_atendimento: item.horario_atendimento || '',
      exercicio:           item.exercicio          || new Date().getFullYear(),
      data_publicacao:     formatDateForInput(item.data_publicacao),
    };
    if (mod === 'lrf') return {
      titulo:           item.titulo           || '',
      competencia:      item.competencia      || '',
      ano:              item.ano              || '',
      data_publicacao:  formatDateForInput(item.data_publicacao),
    };
    // noticias
    return {
      titulo:          item.titulo          || '',
      data_publicacao: formatDateForInput(item.data_publicacao),
      resumo:          item.resumo          || '',
      conteudo:        item.conteudo        || '',
    };
  };

  const [form,    setForm]    = useState(buildInitialForm);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try { await onSave(form); }
    catch (err) { setError(err.message); setSaving(false); }
  };

  const labels = {
    nome_secretaria:    'Nome da Secretaria',
    nome_responsavel:   'Responsável',
    cargo_responsavel:  'Cargo',
    email:              'E-mail',
    telefone:           'Telefone',
    endereco:           'Endereço',
    horario_atendimento:'Horário de Atendimento',
    titulo:             'Título',
    competencia:        'Competência',
    ano:                'Exercício (Ano)',
    data_publicacao:    'Data de Publicação',
    resumo:             'Resumo / Chamada',
    conteudo:           'Conteúdo Completo (Notícia)',
    arquivo_url:        'Link / Nome do Arquivo (Storage)',
    exercicio:          'Exercício / Ano',
  };

  const inputType = (k) => {
    if (k === 'data_publicacao') return 'date';
    if (k === 'url_origem') return 'url';
    if (k === 'ano') return 'number';
    return 'text';
  };

  const isTextarea = (k) => ['resumo', 'conteudo', 'endereco', 'horario_atendimento'].includes(k);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="header-main">
            <span className="badge-meta" style={{ background: '#fef9c3', color: '#854d0e' }}>EDITAR REGISTRO</span>
            <h3 style={{ marginTop: 8 }}>{item.nome_secretaria || item.titulo || `#${item.id}`}</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body scrollable" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mod === 'secretarias' && (
              <div className="sec-preview-top" style={{ marginBottom: 16 }}>
                 <div className="sec-large-photo">
                    {item.foto_url ? <img src={item.foto_url} alt="G" /> : <User size={40} />}
                 </div>
                 <div className="sec-titles">
                    <h4>Visualização do Gestor</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Edite os campos abaixo para atualizar os dados</p>
                 </div>
              </div>
            )}
            {Object.keys(form).map(k => (
              <div key={k}>
                <label className="form-label">{labels[k] || k}</label>
                {isTextarea(k) ? (
                  <textarea
                    value={form[k]}
                    onChange={set(k)}
                    className="form-input"
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                ) : (
                  <input
                    type={inputType(k)}
                    value={form[k]}
                    onChange={set(k)}
                    className="form-input"
                  />
                )}
              </div>
            ))}
            {error && <div className="error-alert"><AlertCircle size={14} /> {error}</div>}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <RefreshCcw size={14} className="spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // States
  const [municipios,        setMunicipios]        = useState([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [stats,             setStats]             = useState({ noticias: 0, lrf: 0, secretarias: 0 });
  const [activeModule,      setActiveModule]      = useState('noticias');
  const [scrapeLimit,       setScrapeLimit]       = useState(20);
  const [dataList,          setDataList]          = useState([]);
  const [selectedItems,     setSelectedItems]     = useState([]);
  const [isScraping,        setIsScraping]        = useState(false);
  const [logs,              setLogs]              = useState('Painel iniciado...\n');
  const [selectedItem,      setSelectedItem]      = useState(null);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [sidebarOpen,       setSidebarOpen]       = useState(true);
  const [showNewModal,      setShowNewModal]      = useState(false);
  const [cityMenuOpen,      setCityMenuOpen]      = useState(false);
  const [moduleMenuOpen,    setModuleMenuOpen]    = useState(false);
  const [sortConfig,        setSortConfig]        = useState({ key: 'id', direction: 'desc' });
  const [editingItem,       setEditingItem]       = useState(null);

  const logRef = useRef(null);

  // Effects
  useEffect(() => { fetchMunicipios(); fetchStats(); }, []);
  useEffect(() => { fetchData(); setSelectedItems([]); }, [activeModule, selectedMunicipio]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  
  useEffect(() => {
    if (!isScraping) return;
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, [isScraping]);

  // Click Outside to Close Popups
  useEffect(() => {
    const handler = (e) => {
      if (moduleMenuOpen && !e.target.closest('.sidebar-module-selector')) setModuleMenuOpen(false);
      if (cityMenuOpen && !e.target.closest('.sidebar-city-selector')) setCityMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moduleMenuOpen, cityMenuOpen]);

  // ── Handlers ─────────────────────────────────────────────
  
  const fetchMunicipios = async () => {
    try { const r = await axios.get(`${API_BASE}/municipios`); setMunicipios(r.data); } catch(e) {}
  };

  const fetchStats = async () => {
    try { const r = await axios.get(`${API_BASE}/stats`); setStats(r.data); } catch(e) {}
  };

  const fetchData = async () => {
    const mod = MODULES.find(m => m.id === activeModule);
    if (!mod?.apiTable) { setDataList([]); return; }
    try {
      const r = await axios.get(`${API_BASE}/${mod.apiTable}`);
      // Filter by municipality if one is selected
      const filtered = selectedMunicipio 
        ? r.data.filter(i => i.municipio_id === selectedMunicipio.id)
        : r.data;
      setDataList(filtered);
    } catch(e) {}
  };

  const fetchLogs = async () => {
    try { 
      const r = await axios.get(`${API_BASE}/logs`); 
      setLogs(r.data.logs); 
      if (isScraping && !r.data.isRunning && r.data.logs.includes('🏁')) {
         setIsScraping(false);
         fetchStats();
         fetchData();
      }
    } catch(e) {}
  };

  const handleScrape = async () => {
    if (!selectedMunicipio || isScraping) return;
    const mod = MODULES.find(m => m.id === activeModule);
    if (!mod?.ready) return;

    setIsScraping(true);
    appendLog(`🚀 Iniciando coleta de ${mod.label} para ${selectedMunicipio.nome}...`);
    try {
      await axios.post(`${API_BASE}/scrape`, {
        modulo: activeModule,
        municipio_id: selectedMunicipio.id,
        limit: scrapeLimit,
      });
    } catch (e) {
      appendLog(`❌ Erro: ${e.response?.data?.error || e.message}`);
      setIsScraping(false);
    }
  };

  const handleCancelScrape = async () => {
    try {
      await axios.post(`${API_BASE}/scrape/cancel`);
      appendLog('🛑 Cancelamento solicitado pelo usuário...');
      setIsScraping(false);
    } catch(e) { appendLog('❌ Erro cancelar: '+e.message); }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Deseja excluir permanentemente este registro?`)) return;
    try {
      const table = activeModule === 'noticias' ? 'tab_noticias' : activeModule === 'lrf' ? 'tab_lrf' : 'tab_secretarias';
      const fileUrl = activeModule === 'noticias' ? item.imagem_url : activeModule === 'lrf' ? item.arquivo_url : item.foto_url;
      await axios.delete(`${API_BASE}/items`, { params: { id: item.id, table, bucket: 'arquivos_municipais', file_url: fileUrl } });
      appendLog(`✅ Registro removido.`);
      fetchStats(); fetchData();
    } catch (e) { appendLog(`❌ Erro ao deletar: ${e.message}`); }
  };

  const handleDeleteMultiple = async () => {
    if(selectedItems.length === 0) return;
    if (!window.confirm(`Deseja excluir ${selectedItems.length} itens selecionados?`)) return;
    appendLog(`🗑️ Processando exclusão de ${selectedItems.length} itens...`);
    for (const item of selectedItems) {
      try {
        const table = activeModule === 'noticias' ? 'tab_noticias' : activeModule === 'lrf' ? 'tab_lrf' : 'tab_secretarias';
        const fileUrl = activeModule === 'noticias' ? item.imagem_url : activeModule === 'lrf' ? item.arquivo_url : item.foto_url;
        await axios.delete(`${API_BASE}/items`, { params: { id: item.id, table, bucket: 'arquivos_municipais', file_url: fileUrl } });
      } catch (e) { console.error(e); }
    }
    appendLog('✅ Remoção concluída.');
    setSelectedItems([]); fetchStats(); fetchData();
  };

  const handleClearData = async () => {
    if (!selectedMunicipio) return;
    if (!window.confirm(`Apagar TODOS os dados de "${activeModule}" para "${selectedMunicipio.nome}"?`)) return;
    const deleteStorage = window.confirm(`Deseja apagar também os arquivos (fotos/PDFs) do storage?`);
    try {
      await axios.delete(`${API_BASE}/clear-data`, {
        params: { municipio_id: selectedMunicipio.id, modulo: activeModule, municipio_nome: selectedMunicipio.nome, delete_storage: deleteStorage },
      });
      appendLog(`✅ Banco de dados limpo.`);
      fetchStats(); fetchData();
    } catch(e) { appendLog(`❌ Erro ao limpar: ${e.message}`); }
  };

  const handleSaveEdit = async (updatedData) => {
    const table = activeModule === 'noticias' ? 'tab_noticias'
      : activeModule === 'lrf' ? 'tab_lrf'
      : 'tab_secretarias';
    try {
      await axios.put(`${API_BASE}/items`, { id: editingItem.id, table, data: updatedData });
      appendLog(`✅ Registro #${editingItem.id} atualizado com sucesso.`);
      setEditingItem(null);
      fetchData(); fetchStats();
    } catch (e) {
      appendLog(`❌ Erro ao salvar edição: ${e.response?.data?.error || e.message}`);
    }
  };

  const appendLog = (line) => setLogs(prev => prev + '\n' + line);

  const requestSort = (key) => {
    let dir = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') dir = 'desc';
    setSortConfig({ key, direction: dir });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  // ── Derived Data ──────────────────────────────────────────
  const sortedData = [...dataList].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    if (sortConfig.key === 'ano') { valA = getExercicio(a); valB = getExercicio(b); }
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const currentMod     = MODULES.find(m => m.id === activeModule);
  const actionsEnabled = !!selectedMunicipio && !isScraping;
  const currentCount   = activeModule === 'noticias' ? stats.noticias : (activeModule === 'secretarias' ? stats.secretarias : stats.lrf);
  const totalCount     = stats.noticias + stats.lrf + (stats.secretarias || 0);
  const storageMB      = (stats.noticias * 0.2 + stats.lrf * 1.5 + (stats.secretarias || 0) * 0.1).toFixed(1);

  return (
    <div className="app-container">

      {/* ─── SIDEBAR ──────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><LayoutDashboard size={18} color="#0A1628" strokeWidth={2.5} /></div>
          <div><div className="brand">PORTAL<span>GOV</span></div><div className="tagline">Admin Dashboard</div></div>
        </div>

        <div className="sidebar-label">Município Atual</div>
        <div className="sidebar-city-selector">
          <button onClick={() => setCityMenuOpen(!cityMenuOpen)} className={`selector-btn ${cityMenuOpen ? 'active' : ''}`}>
             <div className="btn-icon">{selectedMunicipio ? <MapPin size={14} color="var(--accent)" /> : <Building2 size={14} color="#fff" />}</div>
             <span className="btn-text">{selectedMunicipio ? selectedMunicipio.nome : 'Monitoramento Global'}</span>
             <ChevronDown size={14} className={`chevron ${cityMenuOpen ? 'open' : ''}`} />
          </button>
          {cityMenuOpen && (
            <div className="selector-dropdown">
              <div className="dropdown-search">
                <input placeholder="Procurar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onClick={e => e.stopPropagation()} />
              </div>
              <div className="dropdown-list">
                <button className={`dropdown-item ${!selectedMunicipio ? 'active' : ''}`} onClick={() => { setSelectedMunicipio(null); setCityMenuOpen(false); }}>
                  <Building2 size={14} /> Todos os Municípios
                </button>
                {municipios.filter(m => m.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                  <button key={m.id} className={`dropdown-item ${selectedMunicipio?.id === m.id ? 'active' : ''}`} onClick={() => { setSelectedMunicipio(m); setCityMenuOpen(false); }}>
                    <MapPin size={14} /> {m.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-label">Módulo Ativo</div>
        <div className="sidebar-module-selector">
          <button onClick={() => setModuleMenuOpen(!moduleMenuOpen)} className={`selector-btn ${moduleMenuOpen ? 'active' : ''}`}>
             <div className="btn-icon" style={{ background: 'var(--accent)' }}><currentMod.icon size={14} color="#0A1628" /></div>
             <span className="btn-text">{currentMod.label}</span>
             <ChevronDown size={14} className={`chevron ${moduleMenuOpen ? 'open' : ''}`} />
          </button>
          {moduleMenuOpen && (
            <div className="selector-dropdown">
              <div className="dropdown-list">
                {MODULES.map(mod => (
                  <button key={mod.id} className={`dropdown-item ${mod.id === activeModule ? 'active' : ''}`} disabled={!mod.ready} onClick={() => { if(mod.ready){ setActiveModule(mod.id); setModuleMenuOpen(false); }}}>
                    <mod.icon size={14} /> {mod.label}
                    {!mod.ready && <span className="badge-small">EM BREVE</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <button onClick={() => setShowNewModal(true)} className="btn-add-city">
            <Plus size={15} /> Novo Município
          </button>
          <div className="user-profile">
            <div className="avatar">AD</div>
            <div>
              <div className="user-name">Administrador</div>
              <div className="user-role">Master Access</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────── */}
      <main className="main-viewport">
        <header className="main-header">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={18} /></button>
          <div className="header-info">
            <h2>{selectedMunicipio ? selectedMunicipio.nome : 'Global Data Flow'}</h2>
            <div className="header-meta">
               <span className="status-live"><div className="pulse" /> LIVE</span>
               <span className="info-text">{selectedMunicipio ? (selectedMunicipio.url_base || 'Portal não configurado') : `${totalCount.toLocaleString()} registros totais`}</span>
            </div>
          </div>
          <div className="header-stats">
             <div className="h-stat-item"><span className="h-label">Registros</span><span className="h-value">{currentCount}</span></div>
             <div className="h-stat-divider" />
             <div className="h-stat-item"><span className="h-label">Storage</span><span className="h-value">{storageMB}<small>MB</small></span></div>
          </div>
        </header>

        <div className="action-toolbar">
          <div className="toolbar-left">
            <div className="select-wrapper">
              <select value={scrapeLimit} onChange={e => setScrapeLimit(parseInt(e.target.value))} disabled={isScraping}>
                <option value={5}>Teste: 5 itens</option>
                <option value={20}>Padrão: 20 itens</option>
                <option value={50}>Médio: 50 itens</option>
                <option value={0}>Completo (Tudo)</option>
              </select>
            </div>
            
            {isScraping ? (
              <button className="btn-stop" onClick={handleCancelScrape}>
                <X size={15} /> Parar Execução
              </button>
            ) : (
              <button className="btn-primary" onClick={handleScrape} disabled={!actionsEnabled}>
                <RefreshCcw size={15} /> Iniciar Coleta
              </button>
            )}

            <div className="toolbar-divider" />

            {selectedItems.length > 0 ? (
              <button className="btn-danger" onClick={handleDeleteMultiple}>
                <Trash2 size={15} /> Excluir {selectedItems.length} selecionados
              </button>
            ) : (
              <button className="btn-danger-outline" onClick={handleClearData} disabled={!actionsEnabled}>
                <Trash2 size={15} /> Limpar Módulo
              </button>
            )}
          </div>

          {!selectedMunicipio && <div className="notice-banner"><Info size={14} /> Selecione um município para coletar novos dados</div>}
        </div>

        <div className="content-pane">
          <div className="table-container">
            <div className="table-header">
              <div className="th-col col-check">
                <input type="checkbox" checked={sortedData.length > 0 && selectedItems.length === sortedData.length} onChange={e => setSelectedItems(e.target.checked ? sortedData : [])} />
              </div>
              <div className="th-col col-main flex-grow" onClick={() => requestSort('titulo')}>
                {activeModule === 'secretarias' ? 'Secretaria' : 'Título / Descrição'} {renderSortIcon('titulo')}
              </div>
              <div className="th-col col-meta" onClick={() => requestSort('ano')}>Exerc. {renderSortIcon('ano')}</div>
              <div className="th-col col-meta" onClick={() => requestSort('data_publicacao')}>Data {renderSortIcon('data_publicacao')}</div>
              <div className="th-col col-ops">Ações</div>
            </div>

            <div className="table-body">
              {sortedData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><AlertCircle size={40} /></div>
                  <h3>Nenhum registro encontrado</h3>
                  <p>Realize uma coleta para popular esta tabela.</p>
                </div>
              ) : sortedData.map(item => (
                <div key={item.id} className={`tr-row ${selectedItems.some(i => i.id === item.id) ? 'selected' : ''}`} onClick={() => setEditingItem(item)}>
                  <div className="td-col col-check" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedItems.some(i => i.id === item.id)} onChange={e => setSelectedItems(e.target.checked ? [...selectedItems, item] : selectedItems.filter(i => i.id !== item.id))} />
                  </div>
                  
                  {activeModule === 'secretarias' ? (
                    <div className="td-col col-main secretaria-cell">
                      <div className="sec-column-left">
                        <div className="sec-avatar">
                          {item.foto_url ? <img src={item.foto_url} alt="G" /> : <User size={20} />}
                        </div>
                        <div className="sec-info">
                          <div className="sec-name">{item.nome_secretaria}</div>
                          <div className="sec-meta">
                            <span className="meta-line"><strong>Resp:</strong> {item.nome_responsavel} {item.cargo_responsavel && `(${item.cargo_responsavel})`}</span>
                            <span className="meta-line address"><MapPin size={10} /> {item.endereco} • <Clock size={10} /> {item.horario_atendimento}</span>
                          </div>
                        </div>
                      </div>
                      <div className="sec-column-center">
                        <div className="sec-contact-stack">
                           <span className="meta-line"><Mail size={12} /> {item.email || 'N/A'}</span>
                           <span className="meta-line"><Phone size={12} /> {item.telefone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="td-col col-main generic-cell">
                      {activeModule === 'noticias' && (
                        <div className="row-thumb">
                          {item.imagem_url ? <img src={item.imagem_url} alt="T" /> : <Newspaper size={18} />}
                        </div>
                      )}
                      <div className="row-text">
                        <div className="row-title">{item.titulo}</div>
                        <div className="row-excerpt">{(item.resumo || item.conteudo || '').substring(0, 100)}...</div>
                      </div>
                    </div>
                  )}

                  <div className="td-col col-meta">{getExercicio(item)}</div>
                  <div className="td-col col-meta">{formatDate(item.data_publicacao)}</div>
                  
                  <div className="td-col col-ops" onClick={e => e.stopPropagation()}>
                    <button className="op-btn" title="Editar / Ver" onClick={() => setEditingItem(item)}><Pencil size={14} /></button>
                    <button className="op-btn" title="Ver Detalhes" onClick={() => setEditingItem(item)}><Eye size={14} /></button>
                    <button className="op-btn delete" title="Excluir" onClick={() => handleDeleteItem(item)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="terminal-pane">
            <div className="terminal-head">
              <div className="term-title"><Terminal size={14} /> Console de Processamento</div>
              {isScraping && <span className="term-active">ATIVO</span>}
            </div>
            <div className="terminal-body" ref={logRef}>
              {logs.split('\n').map((line, i) => (
                <div key={i} className={`log-line ${classifyLog(line)}`}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* O Modal de Detalhes antigo foi unificado no de Edição */}

      {showNewModal && <NewMunicipioModal onClose={() => setShowNewModal(false)} onCreated={handleMunicipioCreated} />}

      {editingItem && <EditItemModal item={editingItem} module={activeModule} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} />}

    </div>
  );
}
