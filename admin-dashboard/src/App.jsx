import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Newspaper, FileText, RefreshCcw, Trash2,
  ChevronRight, Search, MapPin, Clock, ExternalLink, AlertCircle,
  CheckCircle2, Terminal, FileDown, Building2, Menu, X, Info,
  BarChart3, Database, HardDrive, ChevronDown, Plus, Link,
  Gavel, ScrollText, BookMarked, BookOpen, Globe
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

// ─── Module Definitions ──────────────────────────────────────────────────────
const MODULES = [
  { id: 'noticias',  label: 'Notícias',        icon: Newspaper,   apiTable: 'noticias',  ready: true  },
  { id: 'lrf',       label: 'LRF',             icon: FileText,    apiTable: 'lrf',       ready: true  },
  { id: 'decretos',  label: 'Decretos',        icon: Gavel,       apiTable: null,        ready: false },
  { id: 'leis',      label: 'Leis',            icon: ScrollText,  apiTable: null,        ready: false },
  { id: 'portarias', label: 'Portarias',       icon: BookMarked,  apiTable: null,        ready: false },
  { id: 'atas',      label: 'Atas de Câmara',  icon: BookOpen,    apiTable: null,        ready: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '–';
  const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [y, m, d] = raw.split('-');
  return `${d}/${m}/${y}`;
};

const getExercicio = (item) => {
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

// ─── Modal: New Municipality ──────────────────────────────────────────────────
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
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                Nome do Município *
              </label>
              <input
                type="text"
                placeholder="Ex: Aracati"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="form-input"
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
                  fontSize: 14, fontFamily: 'Source Sans 3, sans-serif',
                  color: 'var(--text-primary)', outline: 'none',
                  transition: 'border-color .15s',
                  background: 'var(--surface)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }}
                onBlur={e  => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--surface)'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                URL do Portal Oficial *
              </label>
              <div style={{ position: 'relative' }}>
                <Globe size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  placeholder="https://www.municipio.ce.gov.br"
                  value={form.url_base}
                  onChange={e => setForm(f => ({ ...f, url_base: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 14px 10px 36px',
                    border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
                    fontSize: 14, fontFamily: 'Source Sans 3, sans-serif',
                    color: 'var(--text-primary)', outline: 'none',
                    transition: 'border-color .15s', background: 'var(--surface)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.background = '#fff'; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--surface)'; }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                URL base usada para construir as URLs de raspagem dos módulos.
              </p>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="modal-btn" style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1.5px solid var(--border)' }}>
              Cancelar
            </button>
            <button type="submit" className="modal-btn modal-btn-primary" disabled={loading}>
              {loading ? <RefreshCcw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              {loading ? 'Cadastrando...' : 'Cadastrar Município'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Module Dropdown ──────────────────────────────────────────────────────────
function ModuleDropdown({ activeModule, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = MODULES.find(m => m.id === activeModule) || MODULES[0];
  const Icon = current.icon;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: open ? 'var(--surface-2)' : 'var(--white)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-md)',
          cursor: 'pointer',
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: 13, fontWeight: 600,
          color: 'var(--text-primary)',
          transition: 'all .15s',
          minWidth: 190,
          boxShadow: 'var(--sh-sm)',
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'var(--navy)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={12} color="#fff" />
        </span>
        <span style={{ flex: 1, textAlign: 'left' }}>{current.label}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : '', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--white)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--sh-xl)',
          overflow: 'hidden', zIndex: 200,
          animation: 'fadeUp .15s ease',
        }}>
          {MODULES.map(mod => {
            const MIcon = mod.icon;
            const isActive = mod.id === activeModule;
            return (
              <button
                key={mod.id}
                onClick={() => { if (mod.ready) { onSelect(mod.id); setOpen(false); } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  cursor: mod.ready ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  fontFamily: 'Source Sans 3, sans-serif',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: !mod.ready ? 'var(--text-muted)' : isActive ? 'var(--navy)' : 'var(--text-primary)',
                  transition: 'background .1s',
                  opacity: mod.ready ? 1 : .55,
                }}
                onMouseEnter={e => { if (mod.ready && !isActive) e.currentTarget.style.background = 'var(--surface)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: isActive ? 'var(--navy)' : 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <MIcon size={12} color={isActive ? '#fff' : 'var(--text-muted)'} />
                </span>
                <span style={{ flex: 1 }}>{mod.label}</span>
                {!mod.ready && (
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4 }}>
                    Em Breve
                  </span>
                )}
                {isActive && <CheckCircle2 size={13} color="var(--navy)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [municipios,        setMunicipios]        = useState([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [stats,             setStats]             = useState({ noticias: 0, lrf: 0 });
  const [activeModule,      setActiveModule]      = useState('noticias');
  const [scrapeLimit,       setScrapeLimit]       = useState(20);
  const [noticias,          setNoticias]          = useState([]);
  const [lrfItems,          setLrfItems]          = useState([]);
  const [logs,              setLogs]              = useState('Monitorando sistema...\n');
  const [isScraping,        setIsScraping]        = useState(false);
  const [selectedItem,      setSelectedItem]      = useState(null);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [sidebarOpen,       setSidebarOpen]       = useState(true);
  const [showNewModal,      setShowNewModal]      = useState(false);

  const logRef = useRef(null);

  // scroll terminal
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => { fetchMunicipios(); fetchStats(); }, []);
  useEffect(() => { fetchData(); }, [activeModule]);

  useEffect(() => {
    if (!isScraping) return;
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, [isScraping]);

  // ── Fetchers ─────────────────────────────────────────────
  const fetchMunicipios = async () => {
    try { const r = await axios.get(`${API_BASE}/municipios`); setMunicipios(r.data); } catch(e) {}
  };

  const fetchStats = async () => {
    try { const r = await axios.get(`${API_BASE}/stats`); setStats(r.data); } catch(e) {}
  };

  const fetchData = async () => {
    const mod = MODULES.find(m => m.id === activeModule);
    if (!mod?.apiTable) { setNoticias([]); setLrfItems([]); return; }
    try {
      const r = await axios.get(`${API_BASE}/${mod.apiTable}`);
      activeModule === 'noticias' ? setNoticias(r.data) : setLrfItems(r.data);
    } catch(e) {}
  };

  const fetchLogs = async () => {
    try { 
      const r = await axios.get(`${API_BASE}/logs`); 
      setLogs(r.data.logs); 
      
      // Auto-update dashboard when scrape process finishes in backend
      if (isScraping && !r.data.isRunning && r.data.logs.includes('🏁')) {
         setIsScraping(false);
         fetchStats();
         fetchData();
      }
    } catch(e) {}
  };

  // ── Actions ──────────────────────────────────────────────
  const handleScrape = async () => {
    if (!selectedMunicipio || isScraping) return;
    const mod = MODULES.find(m => m.id === activeModule);
    if (!mod?.ready) return;

    setIsScraping(true);
    appendLog(`🚀 Iniciando coleta de ${mod.label} — ${selectedMunicipio.nome}...`);
    try {
      await axios.post(`${API_BASE}/scrape`, {
        modulo: activeModule,
        municipio_id: selectedMunicipio.id,
        limit: scrapeLimit,
      });
      // A UI continuará consultando logs periodicamente e o fetchLogs se encarregará de finalizar
    } catch (e) {
      appendLog(`❌ Erro: ${e.response?.data?.error || e.message}`);
      setIsScraping(false);
    }
  };

  const handleClearData = async () => {
    if (!selectedMunicipio) return;
    const mod = MODULES.find(m => m.id === activeModule);
    const okDb = window.confirm(
      `Apagar TODOS OS REGISTROS de "${mod?.label}" do município de "${selectedMunicipio.nome}" no Banco de Dados?\n\nEsta ação é irreversível.`
    );
    if (!okDb) return;

    let deleteStorage = false;
    if (activeModule === 'lrf') {
      deleteStorage = window.confirm(
        `Deseja apagar também todos os ARQUIVOS PDF no Storage referentes a este módulo?\n\nSe clicar em "OK", os PDFs serão deletados permanentemente. Caso "Cancelar", os arquivos permanecerão.`
      );
    }

    appendLog(`🗑️ Limpando ${mod?.label} — ${selectedMunicipio.nome}...`);
    try {
      const r = await axios.delete(`${API_BASE}/clear-data`, {
        params: { 
          municipio_id: selectedMunicipio.id, 
          modulo: activeModule, 
          municipio_nome: selectedMunicipio.nome,
          delete_storage: deleteStorage
        },
      });
      appendLog(`✅ ${r.data.message} (${r.data.storageCleared ?? 0} arquivos removidos)`);
      fetchStats(); fetchData();
    } catch(e) {
      appendLog(`❌ Erro ao limpar: ${e.response?.data?.error || e.message}`);
    }
  };

  const appendLog = (line) => setLogs(prev => prev + '\n' + line);

  const handleMunicipioCreated = (newMunicipio) => {
    setShowNewModal(false);
    fetchMunicipios();
    setSelectedMunicipio(newMunicipio);
    appendLog(`✅ Município "${newMunicipio.nome}" cadastrado com sucesso!`);
  };

  // ── Derived ──────────────────────────────────────────────
  const displayData = (() => {
    const source = activeModule === 'noticias' ? noticias : lrfItems;
    if (!selectedMunicipio) return source;
    return source.filter(i => i.municipio_id === selectedMunicipio.id);
  })();

  const filteredMunicipios = municipios.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentMod     = MODULES.find(m => m.id === activeModule) || MODULES[0];
  const actionsEnabled = !!selectedMunicipio && !isScraping && currentMod.ready;
  const currentCount   = activeModule === 'noticias' ? stats.noticias : stats.lrf;
  const storageMB      = (stats.noticias * 0.2 + stats.lrf * 1.5).toFixed(1);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface)' }}>

      {/* ─── SIDEBAR ──────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LayoutDashboard size={18} color="#0A1628" strokeWidth={2.5} />
            </div>
            <div>
              <div className="brand">PORTAL<span>GOV</span></div>
              <div className="tagline">Painel Administrativo</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search" style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)', color: 'var(--navy-200)', pointerEvents: 'none' }} />
          <input
            placeholder="Buscar município..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* All */}
        <div style={{ padding: '0 10px' }}>
          <button
            className={`city-btn ${!selectedMunicipio ? 'active' : ''}`}
            onClick={() => setSelectedMunicipio(null)}
            style={{ width: '100%', margin: '0 0 4px' }}
          >
            <div className="dot" />
            <Building2 size={15} style={{ opacity: .7 }} />
            <span>Todos os Municípios</span>
          </button>
        </div>

        <div className="sidebar-label">Cidades</div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px', paddingBottom: 8 }}>
          {filteredMunicipios.map(m => (
            <button
              key={m.id}
              className={`city-btn ${selectedMunicipio?.id === m.id ? 'active' : ''}`}
              onClick={() => setSelectedMunicipio(m)}
              style={{ width: '100%', margin: '1px 0' }}
            >
              <div className="dot" />
              <MapPin size={14} style={{ opacity: .6 }} />
              <span style={{ flex: 1 }}>{m.nome}</span>
              <ChevronRight size={13} style={{ opacity: .4 }} />
            </button>
          ))}
        </div>

        {/* Add municipality button */}
        <div style={{ padding: '8px 10px' }}>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 12px',
              background: 'rgba(245,158,11,.1)',
              border: '1px dashed rgba(245,158,11,.4)',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer', color: 'var(--accent)',
              fontFamily: 'Source Sans 3, sans-serif',
              fontSize: 13, fontWeight: 700,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,.1)'; }}
          >
            <Plus size={15} />
            Novo Município
          </button>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,var(--navy-700),var(--navy-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lexend,sans-serif', fontWeight: 800, fontSize: 13, color: '#fff', flexShrink: 0 }}>AD</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>Administrador</div>
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Acesso Master</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─────────────────────────────────────────── */}
      <div className="main">

        {/* Header */}
        <header className="header">
          <button className="header-toggle" onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle sidebar">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <div className="header-title" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2>{selectedMunicipio ? selectedMunicipio.nome : 'Monitoramento Global'}</h2>
              <div className="status-chip"><div className="pulse" />Sistema Ativo</div>
            </div>
            <p>
              {selectedMunicipio
                ? `Portal Oficial: ${selectedMunicipio.url_base || 'Não configurado'}`
                : `${(stats.noticias + stats.lrf).toLocaleString()} registros processados`}
            </p>
          </div>

          <div style={{ marginRight: 20 }}>
            <ModuleDropdown activeModule={activeModule} onSelect={setActiveModule} />
          </div>
        </header>

        {/* Action Bar */}
        <div className="action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <select 
                value={scrapeLimit} 
                onChange={e => setScrapeLimit(parseInt(e.target.value))}
                disabled={!actionsEnabled || isScraping}
                style={{
                    padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', 
                    fontSize: 14, background: 'var(--surface)', fontWeight: 600, color: 'var(--text-primary)', 
                    outline: 'none', cursor: 'pointer', appearance: 'none'
                }}
              >
                <option value={5}>Limitar: 5 itens (Teste)</option>
                <option value={20}>Limitar: 20 itens</option>
                <option value={50}>Limitar: 50 itens</option>
                <option value={100}>Limitar: 100 itens</option>
                <option value={0}>Sem Limite (Extrair Tudo)</option>
              </select>
              <span style={{ position: 'absolute', right: 12, top: 12, pointerEvents: 'none', fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
            </div>

            <button className={`btn-primary ${isScraping ? 'running' : ''}`} onClick={handleScrape} disabled={!actionsEnabled}>
              <RefreshCcw size={15} style={isScraping ? { animation: 'spin 1s linear infinite' } : {}} />
              {isScraping ? 'Processando...' : `Coletar ${currentMod.label}`}
            </button>

            <button className="btn-danger" onClick={handleClearData} disabled={!actionsEnabled}>
              <Trash2 size={15} /> Zerar Dados
            </button>
          </div>

          <div className="divider" />

          {!selectedMunicipio && (
            <div className="warn-notice">
              <Info size={13} />
              Selecione um município para habilitar as ações
            </div>
          )}

          {selectedMunicipio && !currentMod.ready && (
            <div className="warn-notice" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8' }}>
              <Info size={13} />
              Módulo "{currentMod.label}" ainda não possui script de raspagem
            </div>
          )}

          {/* Stats */}
          <div className="stats-group">
            <div className="stat-item">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                <Database size={9} />Registros
              </div>
              <div className="stat-value">{currentCount.toLocaleString()}</div>
            </div>
            <div className="divider" />
            <div className="stat-item">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                <HardDrive size={9} />Storage
              </div>
              <div className="stat-value">{storageMB}<span> MB</span></div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="body-layout">

          {/* Data Feed */}
          <div className="data-feed">
            <div className="section-header">
              <h3>
                {selectedMunicipio ? selectedMunicipio.nome : 'Todos os Municípios'} — {currentMod.label}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {displayData.length} {displayData.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {!currentMod.ready ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ background: '#EFF6FF' }}>
                  <currentMod.icon size={24} color="#3B82F6" />
                </div>
                <h4>Módulo em Desenvolvimento</h4>
                <p>O módulo <strong>{currentMod.label}</strong> ainda está sendo preparado. Em breve disponível!</p>
              </div>
            ) : displayData.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><AlertCircle size={24} /></div>
                <h4>Nenhum dado encontrado</h4>
                <p>{selectedMunicipio ? 'Execute uma nova coleta para este município.' : 'Selecione um município e execute uma coleta.'}</p>
              </div>
            ) : (
              <div className="cards-grid">
                {displayData.map((item, idx) => (
                  <article
                    key={item.id}
                    className="data-card"
                    style={{ animationDelay: `${Math.min(idx * 0.04, 0.5)}s` }}
                    onClick={() => setSelectedItem(item)}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelectedItem(item)}
                    aria-label={`Ver detalhes: ${item.titulo}`}
                  >
                    <div className="card-top">
                      <span className={`badge ${activeModule === 'noticias' ? 'badge-news' : 'badge-lrf'}`}>
                        {activeModule === 'noticias' ? (item.categoria || 'Notícia') : (item.tipo || 'LRF')}
                      </span>
                      <div className="card-date"><Clock size={11} />{formatDate(item.data_publicacao)}</div>
                    </div>
                    <h4 className="card-title">{item.titulo}</h4>
                    <div className="card-footer">
                      <div className="card-meta">
                        <BarChart3 size={12} />Exercício {getExercicio(item)}
                      </div>
                      {activeModule === 'noticias' ? (
                        <span className="card-action success"><CheckCircle2 size={12} />Sincronizado</span>
                      ) : (
                        <span className="card-action link">Ver documento<ChevronRight size={12} /></span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="right-panel">
            <div className="terminal-card">
              <div className="terminal-header">
                <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Terminal size={12} />Task Monitor
                </div>
                <div className="terminal-dots"><span className="d-r" /><span className="d-y" /><span className="d-g" /></div>
              </div>
              <div className="terminal-body" ref={logRef}>
                {logs.split('\n').map((line, i) => (
                  <div key={i} className={`log-line ${classifyLog(line)}`}>{line || '\u00A0'}</div>
                ))}
              </div>
              {isScraping && (
                <div className="terminal-progress">
                  <div className="progress-label"><span>Processando Fluxo</span><span>Em execução</span></div>
                  <div className="progress-track"><div className="progress-bar" /></div>
                </div>
              )}
            </div>

            <div className="info-card">
              <div className="label">Engine de Coleta</div>
              <h4>Automação Inteligente</h4>
              <p>Motor de raspagem extrai, classifica e sincroniza conteúdo de portais municipais com o Supabase de forma autônoma.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DETAIL MODAL ─────────────────────────────────── */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <span className={`badge ${activeModule === 'noticias' ? 'badge-news' : 'badge-lrf'}`} style={{ marginBottom: 8, display: 'inline-block' }}>
                  {activeModule === 'noticias' ? (selectedItem.categoria || 'Notícia') : (selectedItem.tipo || 'LRF')}
                </span>
                <h3>{selectedItem.titulo}</h3>
              </div>
              <button className="modal-close" onClick={() => setSelectedItem(null)} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="modal-meta">
              <div className="meta-block">
                <div className="meta-label"><Clock size={11} />Publicado em</div>
                <div className="meta-value">{formatDate(selectedItem.data_publicacao)}</div>
              </div>
              <div className="meta-block">
                <div className="meta-label"><BarChart3 size={11} />Exercício</div>
                <div className="meta-value">{selectedItem.competencia || getExercicio(selectedItem)}</div>
              </div>
            </div>
            <div className="modal-actions">
              <a href={selectedItem.url_original} target="_blank" rel="noopener noreferrer" className="modal-btn modal-btn-primary">
                <ExternalLink size={15} />Fonte Original
              </a>
              {activeModule === 'lrf' && selectedItem.arquivo_url && (
                <a href={selectedItem.arquivo_url} target="_blank" rel="noopener noreferrer" className="modal-btn modal-btn-accent">
                  <FileDown size={15} />Abrir PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── NEW MUNICIPIO MODAL ──────────────────────────── */}
      {showNewModal && (
        <NewMunicipioModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleMunicipioCreated}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
