"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePortalStore } from '@/store/usePortalStore';
import { Play, Square, ChevronDown } from 'lucide-react';

export default function ScraperPage() {
  const { municipioAtivo } = usePortalStore();
  const [logs, setLogs] = useState('Engine: Node.js/Playwright | v4.0.0\nAguardando comandos...');
  const [isRunning, setIsRunning] = useState(false);
  const [module, setModule] = useState('noticias');
  const [limit, setLimit] = useState(20);
  const [progress, setProgress] = useState(0);
  const [itemsCollected, setItemsCollected] = useState(0);
  
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/scrape');
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            setLogs(data.logs);
            const progMatch = data.logs.match(/(\d+)%/g);
            if (progMatch) {
              const lastMatch = progMatch[progMatch.length - 1];
              setProgress(parseInt(lastMatch));
            }
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
  }, []);

  const handleStart = async () => {
    if (!municipioAtivo) {
      alert("Selecione um município no menu lateral antes de executar.");
      return;
    }
    try {
      setIsRunning(true);
      setLogs('Iniciando raspagem...\n');
      setProgress(0);
      setItemsCollected(0);
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
      setLogs(prev => prev + '\nRaspagem interrompida pelo usuário.');
    } catch (e) {}
  };

  const classifyLog = (line: string) => {
    if (line.includes('❌') || line.toLowerCase().includes('erro')) return 'text-red-400';
    if (line.includes('✅') || line.includes('🏁') || line.toLowerCase().includes('sucesso')) return 'text-emerald-400';
    if (line.includes('🚀')) return 'text-blue-400 font-bold';
    return 'text-slate-300';
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-full">
      <div className="max-w-[1200px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-1 tracking-tight">Console de Raspagem</h1>
          <p className="text-[13px] font-medium text-slate-500">Motor Isolado Node.js / Playwright</p>
        </div>
        
        <div className="flex gap-6 items-start">
          {/* Formulário Esquerdo */}
          <div className="w-[320px] bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5 shrink-0">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Módulo Alvo</label>
              <div className="relative">
                <select 
                  value={module}
                  onChange={e => setModule(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg pl-3 pr-9 py-2.5 text-sm outline-none appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                >
                  <option value="noticias">Notícias</option>
                  <option value="lrf">LRF</option>
                  <option value="atos">Atos Oficiais</option>
                  <option value="secretarias">Secretarias</option>
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Limite de Coleta</label>
              <div className="relative">
                <select 
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg pl-3 pr-9 py-2.5 text-sm outline-none appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                >
                  <option value={5}>5 registros</option>
                  <option value={10}>10 registros</option>
                  <option value={15}>15 registros</option>
                  <option value={20}>20 registros</option>
                  <option value={50}>50 registros</option>
                  <option value={100}>100 registros</option>
                  <option value={0}>Todos (Deep Scan)</option>
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {isRunning ? (
              <button 
                onClick={handleStop}
                className="w-full h-11 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-all mt-2"
              >
                <Square size={16} fill="currentColor" /> Parar
              </button>
            ) : (
              <button 
                onClick={handleStart}
                className="w-full h-11 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-all mt-2"
              >
                <Play size={16} fill="currentColor" /> Executar
              </button>
            )}

            {isRunning && (
              <div className="pt-2 space-y-1.5 border-t border-slate-100 mt-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Console Direito */}
          <div className="flex-1 bg-[#0A0A0A] rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
            {/* Header estilo Terminal */}
            <div className="px-4 py-3 bg-[#111111] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-mono ml-2">
                  SCRAPER ENGINE V4.0 // bash
                  {isRunning && <span className="text-emerald-400">● RUNNING</span>}
                </span>
              </div>
              <button 
                onClick={() => { setLogs('Console limpo.\n'); setProgress(0); setItemsCollected(0); }}
                className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors px-2 py-1 rounded hover:bg-white/10"
              >
                LIMPAR
              </button>
            </div>
            
            <div 
              ref={logRef}
              className="flex-1 p-5 font-mono text-[13px] leading-relaxed overflow-y-auto max-h-[600px] text-[#94a3b8] custom-terminal-scrollbar"
            >
              {logs.split('\n').map((line, i) => (
                <div key={i} className={`mb-1 ${classifyLog(line)}`}>
                  <span className="break-all">{line}</span>
                </div>
              ))}
              {isRunning && <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1 translate-y-1" />}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-terminal-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-terminal-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-terminal-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}
