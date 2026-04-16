import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Database, 
  Play, 
  Trash2, 
  RefreshCw, 
  FileText, 
  ExternalLink,
  MapPin,
  Clock,
  LayoutDashboard,
  Eye,
  X,
  FileDown,
  ChevronRight,
  Filter
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [municipios, setMunicipios] = useState([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [stats, setStats] = useState({ noticias: 0, lrf: 0 });
  const [logs, setLogs] = useState('Aguardando comandos...');
  const [activeModule, setActiveModule] = useState('noticias'); // 'noticias' ou 'lrf'
  
  const [noticias, setNoticias] = useState([]);
  const [atos, setAtos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterYear, setFilterYear] = useState('Todos');
  const logEndRef = useRef(null);

  useEffect(() => {
    fetchMunicipios();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeModule === 'noticias') fetchNoticias();
    else fetchAtos();
  }, [activeModule]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    let interval;
    if (isScraping) {
      interval = setInterval(fetchLogs, 1000);
    }
    return () => clearInterval(interval);
  }, [isScraping]);

  const fetchMunicipios = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/municipios`);
      setMunicipios(data);
      if (data.length > 0) setSelectedMunicipio(data[0]);
    } catch (e) { console.error('Erro municípios'); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/stats`);
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const fetchNoticias = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/noticias`);
      setNoticias(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchAtos = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/lrf`);
      setAtos(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/logs`);
      setLogs(data.logs);
      if (data.logs.includes('finalizado')) {
        setIsScraping(false);
        fetchStats();
        if (activeModule === 'noticias') fetchNoticias();
        else fetchAtos();
      }
    } catch (e) { console.error(e); }
  };

  const startScrape = async () => {
    setIsScraping(true);
    setLogs(`🚀 Iniciando motor: ${activeModule.toUpperCase()}...`);
    try {
      await axios.post(`${API_BASE}/scrape`, { modulo: activeModule });
    } catch (e) {
      setLogs(prev => prev + '\n❌ Erro ao iniciar processo.');
      setIsScraping(false);
    }
  };

  const resetDB = async () => {
    if (!window.confirm('Cuidado! Isso deletará as informações do município selecionado. Continuar?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/clear-data`);
      setLogs('🧹 Banco de dados zerado para o município.');
      fetchStats();
      if (activeModule === 'noticias') fetchNoticias();
      else fetchAtos();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Filtros
  const uniqueYears = ['Todos', ...new Set(atos.map(a => a.ano).filter(Boolean))].sort((a,b) => b-a);
  const filteredAtos = filterYear === 'Todos' ? atos : atos.filter(a => a.ano === parseInt(filterYear));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans p-6 pb-20">
      
      {/* Modal Detalhe (Premium) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
               <div>
                 <h3 className="font-black text-xl text-indigo-600 flex items-center gap-2">
                   <RefreshCw className="w-5 h-5 animate-spin-slow" /> Verificador de Integridade
                 </h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Conferência de Dados em Tempo Real</p>
               </div>
               <button onClick={() => setSelectedItem(null)} className="p-3 hover:bg-slate-100 rounded-full transition-all group">
                 <X className="w-6 h-6 text-slate-400 group-hover:rotate-90 transition-transform" />
               </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-12 gap-10">
               {/* Coluna Esquerda: Documento/Imagem */}
               <div className="md:col-span-5 space-y-6">
                 {activeModule === 'noticias' ? (
                   <div className="aspect-[4/3] bg-slate-100 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-100 border-4 border-white">
                      <img src={selectedItem.imagem_url} alt="Capa" className="w-full h-full object-cover" />
                   </div>
                 ) : (
                   <div className="aspect-[3/4] bg-slate-100 rounded-3xl flex flex-col items-center justify-center border-4 border-dashed border-slate-200">
                      <FileText className="w-20 h-20 text-slate-300 mb-4" />
                      <p className="text-sm font-bold text-slate-400">Documento PDF</p>
                      <a href={selectedItem.arquivo_url} target="_blank" className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                        <FileDown className="w-5 h-5" /> Abrir Original
                      </a>
                   </div>
                 )}
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ponto de Origem</span>
                    <a href={selectedItem.url_original} target="_blank" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 truncate">
                      {selectedItem.url_original} <ExternalLink className="w-3 h-3" />
                    </a>
                 </div>
               </div>

               {/* Coluna Direita: Metadados */}
               <div className="md:col-span-7 space-y-8">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Título Capturado</span>
                    <h2 className="text-3xl font-black leading-tight text-slate-900 mt-2">{selectedItem.titulo}</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ano / Competência</span>
                      <p className="text-lg font-black text-slate-800 mt-1">{selectedItem.competencia || selectedItem.ano || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Publicação</span>
                      {selectedItem.data_publicacao ? (
                        <p className="text-lg font-black text-indigo-600 mt-1">
                          {new Date(selectedItem.data_publicacao).toLocaleDateString('pt-BR')}
                        </p>
                      ) : <p className="text-lg font-black text-slate-300 mt-1">N/A</p>}
                    </div>
                  </div>

                  {activeModule === 'noticias' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autor</span>
                        <p className="text-sm font-bold text-slate-700 mt-1">{selectedItem.autor || 'Governo'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualizações</span>
                        <p className="text-sm font-bold text-slate-700 mt-1">{selectedItem.acessos || 0}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conteúdo Extraído</span>
                    <div className="mt-4 p-6 bg-slate-900 text-slate-300 rounded-3xl text-sm leading-relaxed h-[200px] overflow-y-auto font-mono whitespace-pre-wrap">
                      {activeModule === 'noticias' ? selectedItem.conteudo : `Este é um arquivo PDF catalogado em ${selectedItem.competencia}. O link original foi preservado e o arquivo está hospedado com segurança no Supabase Storage.`}
                    </div>
                  </div>
               </div>
            </div>
            <div className="p-8 bg-slate-50/50 border-t flex justify-end gap-4">
               <button onClick={() => setSelectedItem(null)} className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200">Finalizar Conferência</button>
            </div>
          </div>
        </div>
      )}

      {/* Header Estilo Apple */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center transform hover:rotate-6 transition-transform">
            <LayoutDashboard className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Portal Control</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Engine de Automação Ativa</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-white px-6 py-4 rounded-[1.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <select 
              className="bg-transparent font-black text-sm focus:outline-none cursor-pointer text-slate-700"
              value={selectedMunicipio?.id || ''}
              onChange={(e) => setSelectedMunicipio(municipios.find(m => m.id === e.target.value))}
            >
              {municipios.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-300 uppercase">Notícias</span>
                <span className="text-sm font-black text-slate-900">{stats.noticias}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-300 uppercase">Arquivos LRF</span>
                <span className="text-sm font-black text-slate-900">{stats.lrf}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
        
        {/* Controles e Logs */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Seletor de Módulo */}
          <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-100 grid grid-cols-2 gap-2">
             <button 
               onClick={() => setActiveModule('noticias')}
               className={`py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeModule === 'noticias' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}
             >
               Notícias
             </button>
             <button 
               onClick={() => setActiveModule('lrf')}
               className={`py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeModule === 'lrf' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}
             >
               Arquivos da LRF
             </button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-sm font-black mb-6 uppercase tracking-widest text-slate-400">Terminal de Comando</h2>
            <div className="space-y-4">
              <button 
                onClick={startScrape}
                disabled={isScraping}
                className={`w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black transition-all shadow-xl shadow-transparent ${
                  isScraping 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-slate-900 text-white hover:bg-black hover:shadow-slate-200 active:scale-95'
                }`}
              >
                {isScraping ? <RefreshCw className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isScraping ? 'PROCESSANDO...' : `INICIAR RASPAGEM (${activeModule === 'noticias' ? 'NOTÍCIAS' : 'LRF'})`}
              </button>
              
              <button 
                onClick={resetDB}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-all border border-red-100/50"
              >
                <Trash2 className="w-4 h-4" /> ZERAR BANCO DE DADOS
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Console Logs</h3>
            </div>
            <div className="font-mono text-[11px] text-slate-400 h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed scrollbar-hide">
              {logs}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Verificador de Dados */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[600px]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  {activeModule === 'noticias' ? 'Integridade de Notícias' : 'Arquivos da LRF (PDFs)'}
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-1">Total de {activeModule === 'noticias' ? noticias.length : atos.length} registros sincronizados</p>
              </div>

              {activeModule === 'lrf' && (
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                   <Filter className="w-4 h-4 text-slate-400" />
                   <select 
                     className="bg-transparent text-xs font-black text-slate-600 focus:outline-none"
                     value={filterYear}
                     onChange={(e) => setFilterYear(e.target.value)}
                   >
                     {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {loading ? (
                 <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Sincronizando Banco...</p>
                 </div>
              ) : (
                (activeModule === 'noticias' ? noticias : filteredAtos).map(item => (
                  <div key={item.id} className="group p-5 bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 rounded-3xl transition-all hover:shadow-2xl hover:shadow-indigo-100/30 flex items-center gap-6">
                     <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 flex-shrink-0 shadow-inner">
                        {item.imagem_url ? (
                          <img src={item.imagem_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            {activeModule === 'noticias' ? <FileText className="w-6 h-6" /> : <FileDown className="w-6 h-6" />}
                          </div>
                        )}
                     </div>
                     <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[8px] font-black px-2.5 py-1 rounded-md tracking-widest ${activeModule === 'noticias' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                             {activeModule === 'noticias' ? 'NOTÍCIA' : (item.tipo || 'LRF')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold tracking-tighter">
                            {item.data_publicacao ? new Date(item.data_publicacao).toLocaleDateString('pt-BR') : 'Sem Data'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors text-sm line-clamp-1 truncate max-w-[400px]">
                          {item.titulo}
                        </h4>
                        <div className="flex items-center gap-4 mt-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{item.competencia || `Exercício ${item.ano}`}</p>
                           {activeModule === 'lrf' && (
                             <a href={item.arquivo_url} target="_blank" className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 flex items-center gap-1">
                               <FileDown className="w-3 h-3" /> PDF DOCUMENTO
                             </a>
                           )}
                        </div>
                     </div>
                     <div className="flex-shrink-0">
                        <button 
                          onClick={() => setSelectedItem(item)}
                          className="w-12 h-12 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 rounded-2xl transition-all flex items-center justify-center hover:scale-110 active:scale-95"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                     </div>
                  </div>
                ))
              )}
              
              {!loading && (activeModule === 'noticias' ? noticias : filteredAtos).length === 0 && (
                <div className="text-center py-32 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                   <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Base de Dados Vazia</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;

