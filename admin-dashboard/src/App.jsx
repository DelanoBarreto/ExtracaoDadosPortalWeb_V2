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
      <div className="modal-v3" onClick={e => e.stopPropagation()}>
        <div className="modal-head-v3">
          <div>
            <span className="text-caps" style={{ color: 'var(--pg-orange)', marginBottom: 4, display: 'block' }}>
              Configuração Técnica
            </span>
            <h3 style={{ color: 'var(--pg-text-primary)', fontSize: 16 }}>Cadastrar Município</h3>
          </div>
          <button className="action-btn-v3" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body-v3">
            <div className="form-field-v3">
              <label>Identificação do Município</label>
              <input
                type="text"
                placeholder="Ex: Aracati"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="form-input-v3"
              />
            </div>
            <div className="form-field-v3">
              <label>Endpoint do Portal (URL)</label>
              <input
                type="url"
                placeholder="https://www.municipio.ce.gov.br"
                value={form.url_base}
                onChange={e => setForm(f => ({ ...f, url_base: e.target.value }))}
                className="form-input-v3"
              />
            </div>
            {error && <div style={{ color: 'var(--pg-red)', fontSize: 11, marginTop: 8 }}>{error}</div>}
          </div>
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn-pg-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn-pg-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? <RefreshCcw size={14} className="spin" /> : 'Confirmar Cadastro'}
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
    categorias: item.categorias || ["Administrativo", "Transparência"],
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
      onClose();
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="fse-back-btn" onClick={handleSafeClose}>
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </button>
          <div className="fse-breadcrumb">
            <span>Admin</span>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'capitalize' }}>{mod}</span>
            <ChevronRight size={14} />
            <span className="current">{item.id ? "Editar Registro" : "Novo Registro"}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-pg-ghost" onClick={handleSafeClose}>Descartar</button>
          <button className="btn-pg-ghost" style={{ background: '#FFF3EE', borderColor: 'var(--pg-orange-border)', color: 'var(--pg-orange)' }} onClick={() => handleSave("rascunho")}>
            {saving ? "Salvando..." : "Salvar Rascunho"}
          </button>
          <button className="btn-pg-primary" onClick={() => handleSave("publicado")}>
            {saving ? "Publicando..." : "Publicar agora"}
          </button>
        </div>
      </header>

      <main className="fse-main">
        <div className="fse-content">
          <div className="fse-paper">
            <input 
              className="fse-title-input"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Título do conteúdo..."
            />
            
            <div className="fse-toolbar-v3">
              <button onClick={() => execOp('bold')} title="Negrito"><Bold size={16} /></button>
              <button onClick={() => execOp('italic')} title="Itálico"><Italic size={16} /></button>
              <button onClick={() => execOp('underline')} title="Sublinhado"><Underline size={16} /></button>
              <div className="sep"></div>
              <button onClick={() => execOp('insertUnorderedList')} title="Lista"><List size={16} /></button>
              <button onClick={() => execOp('insertOrderedList')} title="Lista Numérica"><ListOrdered size={16} /></button>
            </div>

            <div 
              className="fse-editor-industrial"
              contentEditable
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: item.conteudo || "" }}
              onInput={(e) => set("conteudo", e.currentTarget.innerHTML)}
            />
          </div>
        </div>

        <aside className="fse-sidebar">
          <div className="fse-card side-card">
            <h3 className="side-title">Status e Visibilidade</h3>
            <div className="status-selector">
              <div className={`status-pill ${form.status}`}>
                <div className="dot"></div>
                {form.status === "publicado" ? "Publicado" : "Rascunho"}
              </div>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="silent-select">
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
              </select>
            </div>
          </div>

          <div className="fse-card side-card">
            <h3 className="side-title">Imagem de Destaque</h3>
            <div className="fse-dropzone">
              {form.imagem_url ? (
                <img src={form.imagem_url} alt="" className="img-preview" />
              ) : (
                <div className="dropzone-empty">
                  <ImageIcon size={32} />
                  <span>Nenhuma imagem</span>
                </div>
              )}
            </div>
          </div>

          <div className="fse-card side-card metadata-card">
            <h3 className="side-title">Detalhes do Registro</h3>
            <div className="meta-list">
              <div className="meta-item">
                <span className="lbl">ID:</span>
                <span className="val">{form.id || "–"}</span>
              </div>
              <div className="meta-item">
                <span className="lbl">Criado:</span>
                <span className="val">{formatDate(form.criado_em)}</span>
              </div>
            </div>
          </div>

          <div className="fse-card side-card">
            <h3 className="side-title">Categorias</h3>
            <div className="tags-container">
              {(form.categorias || []).map((tag, i) => (
                <span key={i} className="tag">
                  {tag}
                  <button onClick={() => set("categorias", form.categorias.filter((_, idx) => idx !== i))}><X size={10} /></button>
                </span>
              ))}
              <button className="btn-add-tag" onClick={() => {
                const tag = prompt("Nova categoria:");
                if (tag) set("categorias", [...(form.categorias || []), tag]);
              }}>+ Add</button>
            </div>
          </div>

          {form.id && (
            <button className="btn-danger-outline full-width" style={{ marginTop: 20 }} onClick={() => onDelete(form)}>
              Excluir Permanentemente
            </button>
          )}
        </aside>
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
  const [terminalOpen, setTerminalOpen] = useState(false);

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
      // Fechar dropdowns se clicar fora
      if (cityMenuOpen && !e.target.closest('.city-selector-v3')) {
        setCityMenuOpen(false);
      }
      if (dropdownBulkOpen && !e.target.closest('.table-actions-v3')) {
        setDropdownBulkOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cityMenuOpen, dropdownBulkOpen]);

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

  // ── Derived Data & V3 Metrics ─────────────────────────────
  const metrics = React.useMemo(() => {
    const total = dataList.length;
    const publicados = dataList.filter(i => (i.status || 'rascunho') === 'publicado').length;
    const pendentes = total - publicados;
    const lastSync = dataList.length > 0 ? formatDate(dataList[0].criado_em) : '–';
    const percentPub = total > 0 ? (publicados / total) * 100 : 0;

    return { total, publicados, pendentes, lastSync, percentPub };
  }, [dataList]);

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
  const storageMB = (stats.noticias * 0.2 + stats.lrf * 1.5 + (stats.secretarias || 0) * 0.1).toFixed(1);

  return (
    <div className="app-container">

      {/* ─── SIDEBAR V3 LIGHT ─────────────────────────────────── */}
      <aside className="sidebar-v3">
        <div className="brand-section">
          <div className="brand-logo-v3">PG</div>
          <div className="brand-info">
            <h1>Portalgov</h1>
            <span>Institucional V3</span>
          </div>
        </div>

        <div className="city-selector-v3" onClick={() => setCityMenuOpen(!cityMenuOpen)}>
          <div className="city-info-v3">
            <span className="city-label">Jurisdição Selecionada</span>
            <span className="city-name">{selectedMunicipio ? selectedMunicipio.nome : 'Todos os Municípios'}</span>
          </div>
          <ChevronDown size={14} color="var(--pg-text-muted)" />
        </div>

        {cityMenuOpen && (
          <div style={{ padding: '0 16px 16px', marginTop: -16 }}>
            <div style={{ background: 'white', border: '1px solid var(--pg-border)', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <button className="nav-item-v3" style={{ width: '100%', borderRadius: 0, borderBottom: '1px solid var(--pg-border-soft)' }} onClick={() => { setSelectedMunicipio(null); setCityMenuOpen(false); }}>
                <Globe size={14} /> Todos os Municípios
              </button>
              {municipios.map(m => (
                <button key={m.id} className="nav-item-v3" style={{ width: '100%', borderRadius: 0, borderBottom: '1px solid var(--pg-border-soft)' }} onClick={() => { setSelectedMunicipio(m); setCityMenuOpen(false); }}>
                  <MapPin size={14} /> {m.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="nav-section-v3">
          <span className="text-caps" style={{ padding: '12px 12px 8px' }}>Módulos de Gestão</span>
          {MODULES.map(mod => (
            <button
              key={mod.id}
              className={`nav-item-v3 ${mod.id === activeModule ? 'active' : ''}`}
              disabled={!mod.ready}
              onClick={() => { if (mod.ready) setActiveModule(mod.id); }}
            >
              <mod.icon size={16} />
              <span>{mod.label}</span>
              <span className="count">{stats[mod.apiTable] || 0}</span>
            </button>
          ))}
        </nav>

        <button className="btn-add-city-v3" onClick={() => setShowNewModal(true)}>
          <Plus size={16} /> Adicionar Município
        </button>

        <div className="sidebar-footer-v3">
          <div className="admin-avatar-v3">DB</div>
          <div className="admin-info-v3">
            <span className="admin-name">Delano Barreto</span>
            <span className="admin-role">Gestor de Tecnologia</span>
          </div>
          <div className="status-dot-online"></div>
        </div>
      </aside>

      {/* ─── MAIN ZONE V3 LIGHT ────────────────────────────────── */}
      {editingItem ? (
        <FullScreenEditor
          item={editingItem}
          module={activeModule}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
          onDelete={() => handleDeleteItem(editingItem)}
        />
      ) : (
        <main className="main-viewport-v3">
          <header className="topbar-v3">
            <div className="page-title-v3">
              Administração / <span style={{ color: 'var(--pg-text-muted)', fontWeight: 400 }}>{currentMod?.label}</span>
            </div>

            <div className="live-sync-badge">
              <div className="dot"></div>
              <span>Live Sync Active</span>
            </div>

            <div className="header-metrics-v3">
              <div className="metric-item-v3">
                <span className="metric-label-v3">Base Indexada</span>
                <span className="metric-value-v3">{(stats.noticias + stats.lrf + (stats.secretarias || 0)).toLocaleString()}</span>
              </div>
              <div className="header-divider-v3"></div>
              <div className="metric-item-v3">
                <span className="metric-label-v3">Storage Local</span>
                <span className="metric-value-v3" style={{ color: 'var(--pg-orange)' }}>{storageMB} MB</span>
              </div>
            </div>
          </header>

          <div className="content-area-v3">
            {/* KPIs */}
            <div className="kpi-grid-v3">
              <div className="kpi-card-v3">
                <span className="kpi-label-v3">Volume Publicado</span>
                <span className="kpi-value-v3">{metrics.publicados}</span>
                <div className="kpi-sub-v3" style={{ color: 'var(--pg-green)' }}>
                  <CheckCircle2 size={10} /> {metrics.percentPub.toFixed(1)}% de eficiência
                </div>
                <div className="progress-bar-v3">
                  <div className="progress-fill-v3" style={{ width: `${metrics.percentPub}%`, background: 'var(--pg-green)' }}></div>
                </div>
              </div>
              <div className="kpi-card-v3">
                <span className="kpi-label-v3">Fila de Sincronia</span>
                <span className="kpi-value-v3">{metrics.pendentes}</span>
                <div className="kpi-sub-v3" style={{ color: 'var(--pg-yellow)' }}>
                  <Clock size={10} /> Itens em Rascunho
                </div>
                <div className="progress-bar-v3">
                  <div className="progress-fill-v3" style={{ width: `${(metrics.pendentes / (metrics.total || 1)) * 100}%`, background: 'var(--pg-yellow)' }}></div>
                </div>
              </div>
              <div className="kpi-card-v3">
                <span className="kpi-label-v3">Última Atividade</span>
                <span className="kpi-value-v3" style={{ fontSize: 16, marginTop: 4 }}>{metrics.lastSync}</span>
                <div className="kpi-sub-v3" style={{ color: 'var(--pg-blue)' }}>
                  <Database size={10} /> {selectedMunicipio ? selectedMunicipio.nome : 'Banco Global'}
                </div>
                <div className="progress-bar-v3">
                  <div className="progress-fill-v3" style={{ width: '100%', background: 'var(--pg-blue)' }}></div>
                </div>
              </div>
            </div>

            {/* Content Table */}
            <div className="table-wrapper-v3">
              <div className="table-header-v3">
                <div className="search-box-v3">
                  <Search size={14} color="var(--pg-text-muted)" />
                  <input placeholder="Buscar nesta coleção..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                <div className="filter-tabs-v3">
                  {['Todos', 'Publicado', 'Rascunho'].map(st => (
                    <button key={st} className={`filter-tab-v3 ${statusFilter === st ? 'active' : ''}`} onClick={() => setStatusFilter(st)}>
                      {st} <span className="tab-count">{dataList.filter(i => (i.status || 'rascunho') === st.toLowerCase()).length}</span>
                    </button>
                  ))}
                </div>

                <div className="table-actions-v3">
                  {isScraping ? (
                    <button className="btn-pg-primary" style={{ background: 'var(--pg-red)' }} onClick={handleCancelScrape}>
                      <X size={14} /> Abortar Coleta
                    </button>
                  ) : (
                    <button className="btn-pg-primary" onClick={handleScrape} disabled={!actionsEnabled}>
                      <RefreshCcw size={14} /> Coletar {scrapeLimit} itens
                    </button>
                  )}

                  <div style={{ position: 'relative' }}>
                    <button className="btn-pg-ghost" onClick={() => setDropdownBulkOpen(!dropdownBulkOpen)}>
                      <ListChecks size={14} /> Lote {selectedItems.length > 0 && `(${selectedItems.length})`}
                    </button>
                    {dropdownBulkOpen && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'white', border: '1px solid var(--pg-border)', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100, width: 200 }}>
                        <button className="nav-item-v3" style={{ width: '100%', borderRadius: 0, borderBottom: '1px solid var(--pg-border-soft)' }} onClick={() => handleBulkStatus('publicado')}>Publicar Selecionados</button>
                        <button className="nav-item-v3" style={{ width: '100%', borderRadius: 0, borderBottom: '1px solid var(--pg-border-soft)' }} onClick={() => handleBulkStatus('rascunho')}>Mover para Rascunho</button>
                        <button className="nav-item-v3" style={{ width: '100%', borderRadius: 0, color: 'var(--pg-red)' }} onClick={handleDeleteMultiple}>Remover Permanentemente</button>
                      </div>
                    )}
                  </div>
                  
                  <button className="btn-pg-danger" onClick={handleClearData} disabled={!actionsEnabled} title="Limpar Módulo">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="table-grid-header">
                <div className="col-label">Select</div>
                <div className="col-label">Capa</div>
                <div className="col-label">Identificação / Título</div>
                <div className="col-label" style={{ textAlign: 'center' }}>Exerc.</div>
                <div className="col-label">Status</div>
                <div className="col-label" style={{ textAlign: 'right' }}>Ações</div>
              </div>

              <div className="table-body-v3">
                {sortedData.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center' }}>
                    <div className="text-caps" style={{ marginBottom: 12 }}>Nenhum dado encontrado</div>
                    <p style={{ color: 'var(--pg-text-secondary)', fontSize: 11 }}>Inicie uma coleta ou mude os filtros para visualizar registros.</p>
                  </div>
                ) : sortedData.map(item => (
                  <div key={item.id} className="table-row-v3" onClick={() => setEditingItem(item)}>
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedItems.some(si => si.id === item.id)} onChange={() => {
                        if (selectedItems.some(si => si.id === item.id)) setSelectedItems(selectedItems.filter(si => si.id !== item.id));
                        else setSelectedItems([...selectedItems, item]);
                      }} />
                    </div>
                    <div className="thumb-v3">
                      {(item.imagem_url || item.foto_url) ? (
                        <img src={item.imagem_url || item.foto_url} alt="" />
                      ) : (
                        <div className="text-caps" style={{ fontSize: 8 }}>FILE</div>
                      )}
                    </div>
                    <div className="row-info-v3">
                      <div className="row-title-v3">{item.titulo || item.nome_secretaria}</div>
                      <div className="row-desc-v3">{item.autor || item.tipo || 'Sistema'} • {formatDate(item.criado_em)}</div>
                    </div>
                    <div className="row-meta-v3">{getExercicio(item)}</div>
                    <div>
                      <span className={`status-badge-v3 status-${(item.status || 'rascunho')}-v3`}>
                        {item.status || 'rascunho'}
                      </span>
                    </div>
                    <div className="row-ops-v3" onClick={e => e.stopPropagation()}>
                      <button className="action-btn-v3 edit" onClick={() => setEditingItem(item)}><Pencil size={12} /></button>
                      <a href={item.link_original || item.url_original} target="_blank" rel="noreferrer" className="action-btn-v3 view"><ExternalLink size={12} /></a>
                      <button className="action-btn-v3 del" onClick={() => handleDeleteItem(item)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ─── LOG PANEL V3 LIGHT ──────────────────────────────── */}
      <aside className="log-panel-v3">
        <div className="log-header-v3">
          <div className="log-active-dot"></div>
          <h2>Console de Operações</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
             <button className="action-btn-v3" onClick={() => setLogs('Painel limpo...\n')}><Eraser size={12} /></button>
          </div>
        </div>
        <div className="log-body-v3" ref={logRef}>
          {logs.split('\n').map((line, i) => (
            <div key={i} className={`log-entry ${classifyLog(line)}`}>
               <span className="timestamp">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
               {line}
            </div>
          ))}
          <div className="log-cursor"></div>
        </div>
      </aside>

      {showNewModal && <NewMunicipioModal onClose={() => setShowNewModal(false)} onCreated={handleMunicipioCreated} />}
    </div>
  );
}
