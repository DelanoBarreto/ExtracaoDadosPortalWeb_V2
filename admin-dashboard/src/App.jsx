import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Newspaper, FileText, RefreshCcw, Trash2,
  ChevronRight, Search, MapPin, Clock, ExternalLink, AlertCircle,
  CheckCircle2, Terminal, FileDown, Building2, Menu, X, Info,
  BarChart3, Database, HardDrive, ChevronDown, Plus, Link,
  Gavel, ScrollText, BookMarked, BookOpen, Globe, Pencil, Eye,
  ArrowUpDown, ArrowUp, ArrowDown, User, Phone, Mail, ArrowLeft, 
  ListChecks, Bold, Italic, List, ListOrdered, Underline, Eraser, 
  Image as ImageIcon, Link as LinkIcon
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

// ─── Module Definitions ──────────────────────────────────────────────────────
const MODULES = [
  { id: 'noticias', label: 'Notícias', icon: Newspaper, apiTable: 'noticias', ready: true },
  { id: 'lrf', label: 'LRF', icon: FileText, apiTable: 'lrf', ready: true },
  { id: 'secretarias', label: 'Secretarias', icon: Building2, apiTable: 'secretarias', ready: true },
  { id: 'decretos', label: 'Decretos', icon: Gavel, apiTable: null, ready: false },
  { id: 'leis', label: 'Leis', icon: ScrollText, apiTable: null, ready: false },
  { id: 'portarias', label: 'Portarias', icon: BookMarked, apiTable: null, ready: false },
  { id: 'atas', label: 'Atas de Câmara', icon: BookOpen, apiTable: null, ready: false },
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

// ─── FullScreenEditor (v2 Silent Interface) ────────────────────────────────────────────────────────────
function FullScreenEditor({ item, module: mod, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => ({
    ...item,
    titulo: item.titulo || item.nome_secretaria || "",
    resumo: item.resumo || "",
    conteudo: item.conteudo || "",
    autor: item.autor || "",
    ano: item.ano || new Date().getFullYear(),
    data_exercicio: item.data_exercicio || (item.data_publicacao ? item.data_publicacao.split('T')[0] : new Date().toISOString().split("T")[0]),
    fonte: item.fonte || item.link_original || item.url_original || "",
    status: item.status || "rascunho",
    categorias: item.categorias || ["Defesa Civil", "Educação"], // Mock default tags
    visualizacoes: item.visualizacoes || item.acessos || 0,
    criado_em: item.criado_em || item.created_at || new Date().toISOString(),
    atualizado_em: item.atualizado_em || item.updated_at || new Date().toISOString()
  }));

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const contentRef = useRef(null);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value, atualizado_em: new Date().toISOString() }));
    setHasChanges(true);
  };

  const execOp = (op, val = null) => {
    document.execCommand(op, false, val);
    if (contentRef.current) {
      set("conteudo", contentRef.current.innerHTML);
    }
  };

  const handleSave = async (statusOverride = null) => {
    setSaving(true);
    try {
      const finalForm = { ...form };
      if (statusOverride) finalForm.status = statusOverride;
      if (contentRef.current) finalForm.conteudo = contentRef.current.innerHTML;
      
      await onSave(finalForm);
      setHasChanges(false);
      onClose(); // Fecha após salvar com sucesso
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSafeClose = () => {
    if (hasChanges) {
      if (window.confirm("Existem alterações não salvas. Deseja realmente sair?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fse-overlay">
      <header className="fse-header">
        <div className="fse-header-left">
          <button className="fse-back-btn" onClick={handleSafeClose}>
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </button>
          <div className="fse-breadcrumb">
            <span>Admin</span>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'capitalize' }}>{mod}</span>
            <ChevronRight size={14} />
            <span className="current">{item.id ? "Editar" : "Inserir"}</span>
          </div>
        </div>
        
        <div className="fse-header-actions">
          <button className="btn-silent" onClick={handleSafeClose}>
            Descartar
          </button>
          <button className="btn-secondary" onClick={() => handleSave("rascunho")}>
            {saving ? "Salvando..." : "Salvar Rascunho"}
          </button>
          <button className="btn-primary" onClick={() => handleSave("publicado")}>
            {saving ? "Publicando..." : (mod === 'noticias' ? "Publicar Agendado" : "Salvar")}
          </button>
        </div>
      </header>

      <main className="fse-content">
        <div className="fse-layout-grid">
          {/* Main Column */}
          <div className="fse-main-col">
            <div className="fse-card editor-card">
              <input
                type="text"
                className="fse-input-title"
                placeholder="Título da notícia..."
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
              />
              
              <textarea
                className="fse-textarea-summary"
                placeholder="Escreva um resumo curto e impactante..."
                value={form.resumo}
                onChange={(e) => set("resumo", e.target.value)}
              />

              <div className="fse-meta-grid-inline">
                <div className="fse-field">
                  <label>Autor</label>
                  <input 
                    type="text" 
                    value={form.autor} 
                    onChange={(e) => set("autor", e.target.value)}
                    placeholder="Nome do autor"
                  />
                </div>
                <div className="fse-field">
                  <label>Fonte / Créditos</label>
                  <input 
                    type="text" 
                    value={form.fonte} 
                    onChange={(e) => set("fonte", e.target.value)}
                    placeholder="Ex: Secretaria de Saúde"
                  />
                </div>
                <div className="fse-field">
                  <label>Ano</label>
                  <input 
                    type="number" 
                    value={form.ano} 
                    onChange={(e) => set("ano", e.target.value)}
                  />
                </div>
                <div className="fse-field">
                  <label>Data Exercício</label>
                  <input 
                    type="date" 
                    value={form.data_exercicio} 
                    onChange={(e) => set("data_exercicio", e.target.value)}
                  />
                </div>
              </div>

              <div className="fse-rich-editor-container">
                <div className="fse-toolbar">
                  <button onClick={() => execOp("bold")} title="Negrito"><Bold size={18} /></button>
                  <button onClick={() => execOp("italic")} title="Itálico"><Italic size={18} /></button>
                  <button onClick={() => execOp("underline")} title="Sublinhado"><Underline size={18} /></button>
                  <div className="toolbar-divider" />
                  <button onClick={() => execOp("formatBlock", "h2")} title="Título 2">H2</button>
                  <button onClick={() => execOp("formatBlock", "h3")} title="Título 3">H3</button>
                  <div className="toolbar-divider" />
                  <button onClick={() => execOp("insertUnorderedList")} title="Lista"><List size={18} /></button>
                  <button onClick={() => execOp("createLink", prompt("URL:"))} title="Link"><LinkIcon size={18} /></button>
                  <button onClick={() => execOp("removeFormat")} title="Limpar"><Eraser size={18} /></button>
                </div>
                <div
                  ref={contentRef}
                  className="fse-editable-area"
                  contentEditable
                  onInput={(e) => {
                    set("conteudo", e.currentTarget.innerHTML);
                    setHasChanges(true);
                  }}
                  dangerouslySetInnerHTML={{ __html: form.conteudo || "" }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <aside className="fse-side-col">
            <div className="fse-card side-card">
              <h3 className="side-title">Status e Visibilidade</h3>
              <div className="status-selector">
                <div className={`status-pill ${form.status}`}>
                  <span className="dot"></span>
                  {form.status === "publicado" ? "Publicado" : form.status === "rascunho" ? "Rascunho" : "Arquivado"}
                </div>
                <select 
                  value={form.status} 
                  onChange={(e) => set("status", e.target.value)}
                  className="silent-select"
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="publicado">Publicado</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
            </div>

            <div className="fse-card side-card">
              <h3 className="side-title">Imagem de Destaque</h3>
              <div className="fse-dropzone">
                {form.imagem_url || form.imagem ? (
                  <img src={form.imagem_url || form.imagem} alt="Destaque" className="img-preview" />
                ) : (
                  <div className="dropzone-empty">
                    <ImageIcon size={32} />
                    <span>Upload de Imagem</span>
                    <small>SVG, PNG, JPG (800x600px)</small>
                  </div>
                )}
              </div>
            </div>

            <div className="fse-card side-card metadata-card">
              <h3 className="side-title">Detalhes do Documento</h3>
              <div className="meta-list">
                <div className="meta-item">
                  <span className="lbl">ID:</span>
                  <code className="val-code">{form.id || "Novo"}</code>
                </div>
                <div className="meta-item">
                  <span className="lbl">Data do cadastro:</span>
                  <span className="val">{new Date(form.criado_em).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="meta-item">
                  <span className="lbl">Atualizado em:</span>
                  <span className="val">{new Date(form.atualizado_em).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="meta-item">
                  <span className="lbl">Visualizações:</span>
                  <span className="val badge-view">{form.visualizacoes || 0} acessos</span>
                </div>
              </div>
            </div>

            <div className="fse-card side-card">
              <h3 className="side-title">Categorias</h3>
              <div className="tags-container">
                {form.categorias?.map((tag, i) => (
                  <span key={i} className="tag">
                    {tag}
                    <button className="tag-remove" onClick={() => {
                      const newTags = form.categorias.filter((_, idx) => idx !== i);
                      set("categorias", newTags);
                    }}><X size={10} /></button>
                  </span>
                ))}
                <button className="btn-add-tag" onClick={() => {
                  const tag = prompt("Nova categoria:");
                  if (tag) set("categorias", [...(form.categorias || []), tag]);
                }}>
                  + Adicionar
                </button>
              </div>
            </div>

            {form.id && (
              <button className="btn-danger-outline full-width" onClick={() => onDelete(form.id)}>
                Excluir Permanentemente
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // States
  const [municipios, setMunicipios] = useState([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [stats, setStats] = useState({ noticias: 0, lrf: 0, secretarias: 0 });
  const [activeModule, setActiveModule] = useState('noticias');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [scrapeLimit, setScrapeLimit] = useState(20);
  const [dataList, setDataList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [logs, setLogs] = useState('Painel iniciado...\n');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [editingItem, setEditingItem] = useState(null);
  const [dropdownBulkOpen, setDropdownBulkOpen] = useState(false);

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

  useEffect(() => {
    const handler = (e) => {
      if (moduleMenuOpen && !e.target.closest('.sidebar-module-selector')) setModuleMenuOpen(false);
      if (cityMenuOpen && !e.target.closest('.sidebar-city-selector')) setCityMenuOpen(false);
      if (dropdownBulkOpen && !e.target.closest('.bulk-dropdown-wrapper')) setDropdownBulkOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moduleMenuOpen, cityMenuOpen, dropdownBulkOpen]);

  // ── Handlers ─────────────────────────────────────────────

  const fetchMunicipios = async () => {
    try { const r = await axios.get(`${API_BASE}/municipios`); setMunicipios(r.data); } catch (e) { }
  };

  const fetchStats = async () => {
    try { const r = await axios.get(`${API_BASE}/stats`); setStats(r.data); } catch (e) { }
  };

  const fetchData = async () => {
    const mod = MODULES.find(m => m.id === activeModule);
    if (!mod?.apiTable) { setDataList([]); return; }
    try {
      const r = await axios.get(`${API_BASE}/${mod.apiTable}`);
      const filtered = selectedMunicipio
        ? r.data.filter(i => i.municipio_id === selectedMunicipio.id)
        : r.data;
      setDataList(filtered);
    } catch (e) { }
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
    } catch (e) { }
  };

  const handleMunicipioCreated = (m) => {
    setMunicipios([...municipios, m]);
    setSelectedMunicipio(m);
    setShowNewModal(false);
    appendLog(`✅ Município ${m.nome} cadastrado!`);
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
    } catch (e) { appendLog('❌ Erro cancelar: ' + e.message); }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Deseja excluir permanentemente este registro?`)) return;
    try {
      const table = activeModule === 'noticias' ? 'tab_noticias' : activeModule === 'lrf' ? 'tab_lrf' : 'tab_secretarias';
      const fileUrl = activeModule === 'noticias' ? item.imagem_url : activeModule === 'lrf' ? item.arquivo_url : item.foto_url;
      await axios.delete(`${API_BASE}/items`, { params: { id: item.id, table, bucket: 'arquivos_municipais', file_url: fileUrl } });
      appendLog(`✅ Registro removido.`);
      setEditingItem(null);
      fetchStats(); fetchData();
    } catch (e) { appendLog(`❌ Erro ao deletar: ${e.message}`); }
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedItems.length === 0) return;
    setDropdownBulkOpen(false);
    const table = activeModule === 'noticias' ? 'tab_noticias' : activeModule === 'lrf' ? 'tab_lrf' : 'tab_secretarias';
    const ids = selectedItems.map(i => i.id);
    try {
      await axios.put(`${API_BASE}/items/status`, { table, ids, status: newStatus });
      appendLog(`✅ Status de ${ids.length} itens alterado para "${newStatus}".`);
      setSelectedItems([]);
      fetchData();
    } catch (e) { appendLog(`❌ Erro em lote: ${e.message}`); }
  };

  const handleDeleteMultiple = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Deseja excluir ${selectedItems.length} itens selecionados?`)) return;
    setDropdownBulkOpen(false);
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
    } catch (e) { appendLog(`❌ Erro ao limpar: ${e.message}`); }
  };

  const handleSaveEdit = async (updatedData) => {
    const table = activeModule === 'noticias' ? 'tab_noticias' : activeModule === 'lrf' ? 'tab_lrf' : 'tab_secretarias';
    try {
      await axios.put(`${API_BASE}/items`, { id: editingItem.id, table, data: updatedData });
      appendLog(`✅ Registro #${editingItem.id} atualizado.`);
      setEditingItem(null);
      fetchData();
    } catch (e) { appendLog(`❌ Erro: ${e.message}`); }
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
  let filtered = dataList.filter(i => {
    if (statusFilter === 'Todos') return true;
    return (i.status || 'rascunho').toLowerCase() === statusFilter.toLowerCase();
  });

  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter(i => (i.titulo || i.nome_secretaria || '').toLowerCase().includes(s));
  }

  const sortedData = [...filtered].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    if (sortConfig.key === 'ano') { valA = getExercicio(a); valB = getExercicio(b); }
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const currentMod = MODULES.find(m => m.id === activeModule);
  const actionsEnabled = !!selectedMunicipio && !isScraping;
  const currentCount = activeModule === 'noticias' ? stats.noticias : (activeModule === 'secretarias' ? stats.secretarias : stats.lrf);
  const storageMB = (stats.noticias * 0.2 + stats.lrf * 1.5 + (stats.secretarias || 0) * 0.1).toFixed(1);

  return (
    <div className="app-container">

      {/* ─── SIDEBAR ──────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'} ${editingItem ? 'disabled-during-edit' : ''}`}>
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
              <div className="dropdown-list">
                <button className={`dropdown-item ${!selectedMunicipio ? 'active' : ''}`} onClick={() => { setSelectedMunicipio(null); setCityMenuOpen(false); }}>
                  <Building2 size={14} /> Todos os Municípios
                </button>
                {municipios.map(m => (
                  <button key={m.id} className={`dropdown-item ${selectedMunicipio?.id === m.id ? 'active' : ''}`} onClick={() => { setSelectedMunicipio(m); setCityMenuOpen(false); }}>
                    <MapPin size={14} /> {m.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-label">Módulos de Dados</div>
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
                  <button key={mod.id} className={`dropdown-item ${mod.id === activeModule ? 'active' : ''}`} disabled={!mod.ready} onClick={() => { if (mod.ready) { setActiveModule(mod.id); setModuleMenuOpen(false); } }}>
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
            <div><div className="user-name">Administrador</div><div className="user-role">Master Access</div></div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────── */}
      {editingItem ? (
        <FullScreenEditor 
          item={editingItem} 
          module={activeModule} 
          onClose={() => setEditingItem(null)} 
          onSave={handleSaveEdit}
          onDelete={() => handleDeleteItem(editingItem)}
        />
      ) : (
        <main className="main-viewport">
          <header className="main-header">
            <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={18} /></button>
            <div className="header-info">
              <h2>{selectedMunicipio ? selectedMunicipio.nome : 'Painel de Controle Nacional'}</h2>
              <div className="header-meta">
                <span className="status-live"><div className="pulse" /> LIVE SYNC</span>
                <span className="info-text">{selectedMunicipio ? (selectedMunicipio.url_base || 'Portal não configurado') : `Gerenciando ${stats.noticias + stats.lrf + stats.secretarias} registros`}</span>
              </div>
            </div>
            <div className="header-stats">
              <div className="h-stat-item"><span className="h-label">Registros</span><span className="h-value">{currentCount}</span></div>
              <div className="h-stat-divider" />
              <div className="h-stat-item"><span className="h-label">Storage</span><span className="h-value">{storageMB}<small>MB</small></span></div>
            </div>
          </header>


          {/* NOVAS TABS DE STATUS (Requisito do Print 1) */}
          <div className="status-tabs">
            {['Todos', 'Publicado', 'Rascunho', 'Arquivado'].map(st => (
              <button key={st} className={`status-tab ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>
                {st} {st === 'Todos' ? '' : `(${dataList.filter(i => (i.status||'rascunho') === st.toLowerCase()).length})`}
              </button>
            ))}
          </div>

          <div className="action-toolbar" style={{ marginTop: -12 }}>
            <div className="toolbar-left">
              <div className="search-input-wrapper">
                <Search size={15} />
                <input placeholder={`Buscar em ${currentMod.label}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              
              <div className="select-wrapper">
                <select value={scrapeLimit} onChange={e => setScrapeLimit(parseInt(e.target.value))} disabled={isScraping}>
                  { [5, 20, 50, 0].map(v => <option key={v} value={v}>{v === 0 ? 'Tudo' : `Coletar ${v}`}</option>) }
                </select>
              </div>

              {isScraping ? (
                <button className="btn-stop" onClick={handleCancelScrape}><X size={15} /> Parar Coleta</button>
              ) : (
                <button className="btn-primary" onClick={handleScrape} disabled={!actionsEnabled}><RefreshCcw size={15} /> Iniciar Coleta</button>
              )}

              <div className="bulk-dropdown-wrapper" style={{ position: 'relative' }}>
                <button 
                  className="btn-outline" 
                  onClick={() => {
                    if (selectedItems.length === 0) {
                      appendLog('⚠️ Selecione um ou mais registros na tabela para realizar ações em lote.');
                      return;
                    }
                    setDropdownBulkOpen(!dropdownBulkOpen);
                  }}
                  style={{ background: selectedItems.length > 0 ? 'var(--navy-50)' : '#fff', borderColor: selectedItems.length > 0 ? 'var(--navy-200)' : 'var(--border)' }}
                >
                  <ListChecks size={15} /> Ações em Lote {selectedItems.length > 0 && `(${selectedItems.length})`}
                  <ChevronDown size={14} className={`chevron ${dropdownBulkOpen ? 'open' : ''}`} />
                </button>
                {dropdownBulkOpen && (
                  <div className="selector-dropdown floating" style={{ left: 0, top: 'calc(100% + 8px)', width: 220, zIndex: 1000, position: 'absolute' }}>
                    <div className="dropdown-list">
                      <div className="dropdown-label" style={{ padding: '8px 12px', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>MUDAR STATUS</div>
                      <button className="dropdown-item" onClick={() => handleBulkStatus('publicado')}><CheckCircle2 size={14} color="#10b981" /> Publicar Selecionados</button>
                      <button className="dropdown-item" onClick={() => handleBulkStatus('rascunho')}><Pencil size={14} color="#f59e0b" /> Mover para Rascunho</button>
                      <button className="dropdown-item" onClick={() => handleBulkStatus('arquivado')}><HardDrive size={14} color="#6b7280" /> Arquivar Selecionados</button>
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <button className="dropdown-item" style={{ color: '#dc2626' }} onClick={handleDeleteMultiple}><Trash2 size={14} /> Excluir Selecionados</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="toolbar-right">
              <button className="btn-danger-outline" onClick={handleClearData} disabled={!actionsEnabled}><Trash2 size={15} /> Limpar Módulo</button>
            </div>
          </div>

          <div className="content-pane" style={{ padding: '0 32px 32px', gap: 24 }}>
            <div className="table-container shadow-sm">
              <div className="table-header">
                <div className="th-col col-check">
                  <input type="checkbox" checked={sortedData.length > 0 && selectedItems.length === sortedData.length} onChange={e => setSelectedItems(e.target.checked ? sortedData : [])} />
                </div>
                <div className="th-col col-main flex-grow" onClick={() => requestSort('titulo')}>
                  {activeModule === 'secretarias' ? 'Secretaria / Orgão' : 'Título'} {renderSortIcon('titulo')}
                </div>
                <div className="th-col col-meta" onClick={() => requestSort('ano')}>Exerc. {renderSortIcon('ano')}</div>
                <div className="th-col col-meta">Status</div>
                <div className="th-col col-ops">Operações</div>
              </div>

              <div className="table-body">
                {sortedData.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Info size={40} /></div>
                    <h3>Sem itens para exibir</h3>
                    <p>Use o filtro acima ou colete dados novos.</p>
                  </div>
                ) : sortedData.map(item => (
                  <div key={item.id} className={`tr-row ${selectedItems.some(i => i.id === item.id) ? 'selected' : ''}`} onClick={() => setEditingItem(item)}>
                    <div className="td-col col-check" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedItems.some(i => i.id === item.id)} onChange={e => setSelectedItems(e.target.checked ? [...selectedItems, item] : selectedItems.filter(i => i.id !== item.id))} />
                    </div>

                    {activeModule === 'secretarias' ? (
                      <div className="td-col col-main secretaria-cell">
                        <div className="sec-column-left">
                          <div className="sec-avatar">{item.foto_url ? <img src={item.foto_url} alt="G" /> : <User size={20} />}</div>
                          <div className="sec-info">
                            <div className="sec-name">{item.nome_secretaria}</div>
                            <div className="sec-meta"><span className="meta-line"><strong>Titular:</strong> {item.nome_responsavel}</span></div>
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
                          <div className="row-thumb">{item.imagem_url ? <img src={item.imagem_url} alt="T" /> : <Database size={18} />}</div>
                        )}
                        <div className="row-text">
                          <div className="row-title">{item.titulo}</div>
                          <div className="row-excerpt">{(item.resumo || item.conteudo || '').substring(0, 90)}...</div>
                        </div>
                      </div>
                    )}

                    <div className="td-col col-meta">{getExercicio(item)}</div>
                    <div className="td-col col-meta">
                      <span className={`badge ${item.status === 'publicado' ? 'badge-stats' : 'badge-news'}`} style={{ textTransform: 'capitalize' }}>
                        {item.status || 'rascunho'}
                      </span>
                    </div>

                    <div className="td-col col-ops" onClick={e => e.stopPropagation()}>
                      <button className="op-btn" onClick={() => setEditingItem(item)}><Pencil size={14} /></button>
                      <button className="op-btn" onClick={() => window.open(item.url_original || item.url_origem, '_blank')}><ExternalLink size={14} /></button>
                      <button className="op-btn delete" onClick={() => handleDeleteItem(item)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="terminal-pane">
              <div className="terminal-head">
                <div className="term-title"><Terminal size={14} /> Log do Coletor</div>
                {isScraping && <span className="term-active">EM EXECUÇÃO</span>}
              </div>
              <div className="terminal-body" ref={logRef}>
                {logs.split('\n').map((line, i) => (
                  <div key={i} className={`log-line ${classifyLog(line)}`}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {showNewModal && <NewMunicipioModal onClose={() => setShowNewModal(false)} onCreated={handleMunicipioCreated} />}
    </div>
  );
}
