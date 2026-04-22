"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePortalStore } from '@/store/usePortalStore';
import { 
  Play, Square, Eraser, TerminalSquare, 
  Settings2, X, ChevronRight, Activity,
  Database, CheckCircle2, Clock, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ScraperDrawer() {
  const { logPanelOpen, setLogPanelOpen, municipioAtivo } = usePortalStore();
  const [logs, setLogs] = useState('Console de Raspagem v3.0 Inicializado...\nAguardando comandos...');
  const [isRunning, setIsRunning] = useState(false);
  const [module, setModule] = useState('noticias');
  const [limit, setLimit] = useState(20);
  const [progress, setProgress] = useState(0);
  const [itemsCollected, setItemsCollected] = useState(0);
  
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Polling logs when open
  useEffect(() => {
    if (!logPanelOpen) return;
    
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/scrape');
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            setLogs(data.logs);
            
            // Extrair progresso
            const progMatch = data.logs.match(/(\d+)%/g);
            if (progMatch) {
              const lastMatch = progMatch[progMatch.length - 1];
              setProgress(parseInt(lastMatch));
            }

            // Contar itens salvos (procurando ícones de sucesso)
            const successCount = (data.logs.match(/✅|Salvo:|Sucesso!/g) || []).length;
            setItemsCollected(successCount);
          }
          setIsRunning(data.isRunning);
        }
      } catch (err) {}
    };

    fetchLogs();
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, [logPanelOpen]);

  const handleStart = async () => {
    if (!municipioAtivo) return;
    try {
      setIsRunning(true);
      await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo: module, municipio_id: municipioAtivo.id, limit })
      });
    } catch (e) {
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      await fetch('/api/scrape', { method: 'DELETE' });
      setIsRunning(false);
    } catch (e) {}
  };

  const classifyLog = (line: string) => {
    if (line.includes('❌') || line.toLowerCase().includes('erro')) return 'text-red-400 bg-red-400/5';
    if (line.includes('✅') || line.includes('🏁') || line.toLowerCase().includes('sucesso')) return 'text-emerald-400 bg-emerald-400/5';
    if (line.includes('🚀')) return 'text-blue-400 font-semibold';
    return 'text-slate-300';
  };

  return (
    <AnimatePresence>
      {logPanelOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLogPanelOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
              zIndex: 999
            }}
          />

            <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className="fixed right-0 top-0 bottom-0 w-[clamp(340px,45vw,520px)] bg-white z-[1000] flex flex-col shadow-[-20px_0_80px_rgba(15,23,42,0.15)] border-l border-[var(--color-border-soft)]"
          >
            {/* ── Header Institucional do Console ───────────────────── */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-gradient-to-br from-slate-50/50 to-white">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-glow)] flex items-center justify-center text-[var(--color-primary)] shadow-sm">
                  <Activity size={24} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="label-caps !text-[10px]">Back-office Engine</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="label-caps !text-[10px] !text-[var(--color-primary)]">Scraper v3.0</span>
                  </div>
                  <h3 className="text-xl font-black text-[var(--color-ink)] tracking-tight">
                    Extração & Coleta
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setLogPanelOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-[var(--color-ink)] transition-all flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
              
              {/* Analytics Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100 group hover:border-[var(--color-primary-glow)] transition-all">
                  <div className="flex items-center gap-2 text-[var(--color-muted)] mb-3">
                    <Database size={14} />
                    <span className="label-caps !text-[9px]">Ingestão de Dados</span>
                  </div>
                  <div className="text-2xl font-black text-[var(--color-ink)] flex items-baseline gap-1">
                    4.2 <span className="text-xs font-bold text-slate-400">GB</span>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                    Fluxo Otimizado
                  </div>
                </div>
                <div className="p-6 rounded-[1.5rem] bg-blue-50/30 border border-blue-100 group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-2 text-blue-600/60 mb-3">
                    <Zap size={14} />
                    <span className="label-caps !text-[9px]">Status do Motor</span>
                  </div>
                  <div className={`text-2xl font-black ${isRunning ? 'text-blue-600' : 'text-slate-400'}`}>
                    {isRunning ? 'ATIVO' : 'IDLE'}
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-blue-500 uppercase tracking-tighter">
                    {isRunning ? 'Processando Lote' : 'Aguardando Gatilho'}
                  </div>
                </div>
              </div>

              {/* Control Center */}
              <div className="p-6 rounded-[2rem] bg-[#0f172a] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,#3b82f615,transparent_50%)] pointer-events-none" />
                
                <div className="relative z-10 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="label-caps !text-[9px] !text-slate-400">Canal de Extração</label>
                      <select 
                        id="module-select"
                        value={module}
                        onChange={e => setModule(e.target.value)}
                        disabled={isRunning}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="noticias">Notícias & Atos Oficiais</option>
                        <option value="lrf">Documentação LRF</option>
                        <option value="secretarias">Estrutura Administrativa</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-[9px] !text-slate-400">Profundidade (Itens)</label>
                      <select 
                        id="limit-select"
                        value={limit}
                        onChange={e => setLimit(Number(e.target.value))}
                        disabled={isRunning}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                      >
                        {[10, 20, 50, 100, 200].map(v => <option key={v} value={v}>{v} registros</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-0">
                    {isRunning ? (
                      <button 
                        onClick={handleStop}
                        className="flex-1 h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(239,68,68,0.2)] transition-all active:scale-95"
                      >
                        <Square size={16} fill="currentColor" />
                        Interromper
                      </button>
                    ) : (
                      <button 
                        onClick={handleStart}
                        className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
                      >
                        <Play size={16} fill="currentColor" />
                        Disparar Coleta
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setLogs('Console limpo.\nAguardando nova execução.');
                        setProgress(0);
                      }}
                      className="w-14 h-14 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all active:scale-95"
                    >
                      <Eraser size={20} />
                    </button>
                  </div>

                  {/* Visual Progress Bar */}
                  {isRunning && (
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-blue-400">Progresso da Tarefa</span>
                        <div className="flex gap-4">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Database size={10} /> {itemsCollected} Salvos
                          </span>
                          <span className="text-blue-400">{progress}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ type: 'spring', stiffness: 50 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Elite Terminal */}
              <div className="flex-1 min-h-[350px] bg-[#020617] rounded-[2rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Runtime Output — {municipioAtivo?.nome || 'Admin'}
                    </span>
                  </div>
                  <TerminalSquare size={14} className="text-slate-700" />
                </div>
                
                <div 
                  ref={logRef}
                  className="flex-1 p-6 font-mono text-[12px] leading-relaxed overflow-y-auto selection:bg-blue-500/30 custom-terminal-scrollbar"
                >
                  {logs.split('\n').map((line, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`mb-1.5 flex gap-4 ${classifyLog(line)}`}
                    >
                      <span 
                        suppressHydrationWarning
                        className="text-slate-700 shrink-0 select-none text-[9px] w-14"
                      >
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="break-all">{line}</span>
                    </motion.div>
                  ))}
                  {isRunning && (
                    <motion.div 
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-2 h-4 bg-blue-500 ml-1 translate-y-0.5"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Persistence Footer */}
            <div className="p-6 px-8 border-top border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[var(--color-muted)]">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold tracking-tight">UPTIME 142H</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-muted)]">
                  <Activity size={14} />
                  <span className="text-[10px] font-bold tracking-tight">LATENCY 12MS</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isRunning ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isRunning ? 'Executando Coleta' : 'Aguardando'}
                </span>
              </div>
            </div>

            <style jsx global>{`
              .custom-scrollbar::-webkit-scrollbar { width: 4px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
              
              .custom-terminal-scrollbar::-webkit-scrollbar { width: 4px; }
              .custom-terminal-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-terminal-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
            `}</style>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
