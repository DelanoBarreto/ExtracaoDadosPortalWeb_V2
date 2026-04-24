"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePortalStore } from '@/store/usePortalStore';
import { Play, Square, ChevronDown, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ScraperPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { municipioAtivo } = usePortalStore();
  
  const [logs, setLogs] = useState('Engine: Node.js/Playwright | v4.0.0\nAguardando comandos...');
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [module, setModule] = useState(searchParams.get('module') || 'noticias');
  const [limit, setLimit] = useState(20);
  const [progress, setProgress] = useState(0);
  const [itemsCollected, setItemsCollected] = useState(0);
  const [countdown, setCountdown] = useState(5);
  
  const logRef = useRef<HTMLDivElement>(null);
  const lastLogsRef = useRef('');

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Polling logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/scrape');
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            setLogs(data.logs);
            
            // Extract Progress %
            const progMatch = data.logs.match(/(\d+)%/g);
            if (progMatch) {
              const lastMatch = progMatch[progMatch.length - 1];
              setProgress(parseInt(lastMatch));
            }
            
            // Count "✅ Salvo:" or "✅ Sucesso!" entries
            const successCount = (data.logs.match(/✅ Salvo:|✅ Sucesso!/g) || []).length;
            setItemsCollected(successCount);

            // Detect end of process
            if (lastLogsRef.current.includes('RUNNING') && !data.isRunning && data.logs.includes('FINALIZADO')) {
               if (data.logs.includes('Código: 0')) {
                 setIsFinished(true);
               }
            }
          }
          setIsRunning(data.isRunning);
          lastLogsRef.current = data.isRunning ? 'RUNNING' : 'IDLE';
        }
      } catch (err) {}
    };

    fetchLogs();
    const id = setInterval(fetchLogs, 1500);
    return () => clearInterval(id);
  }, []);

  // Countdown for redirect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFinished && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (isFinished && countdown === 0) {
      handleGoToModule();
    }
    return () => clearTimeout(timer);
  }, [isFinished, countdown]);

  const handleStart = async () => {
    if (!municipioAtivo) {
      alert("Selecione um município no menu lateral antes de executar.");
      return;
    }
    try {
      setIsRunning(true);
      setIsFinished(false);
      setCountdown(5);
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
    } catch (e) {}
  };

  const handleGoToModule = () => {
    router.push(`/${module}`);
  };

  const classifyLog = (line: string) => {
    if (line.includes('❌') || line.toLowerCase().includes('erro')) return 'text-red-400';
    if (line.includes('✅') || line.includes('🏁') || line.toLowerCase().includes('sucesso')) return 'text-emerald-400 font-bold';
    if (line.includes('🚀')) return 'text-blue-400 font-bold';
    if (line.includes('📄') || line.includes('⏳')) return 'text-amber-300';
    return 'text-slate-400';
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-full">
      <div className="max-w-[1200px]">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-black text-[#0F172A] mb-1 tracking-tight">Console de Raspagem</h1>
            <p className="text-[14px] font-bold text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Portalgov Automated Engine v4.2 Elite
            </p>
          </div>
          {municipioAtivo && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Alvo Ativo</span>
              <span className="text-[13px] font-bold text-blue-600 uppercase">{municipioAtivo.nome}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-8 items-start">
          {/* Formulário Esquerdo */}
          <div className="w-[340px] bg-white rounded-2xl shadow-xl border border-slate-200 p-8 flex flex-col gap-6 shrink-0">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Módulo Alvo</label>
              <div className="relative">
                <select 
                  value={module}
                  onChange={e => setModule(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-4 pr-10 py-3.5 text-sm outline-none appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                >
                  <option value="noticias">Notícias & Atos</option>
                  <option value="lrf">Transparência LRF</option>
                  <option value="secretarias">Secretarias</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Limite de Coleta</label>
              <div className="relative">
                <select 
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-4 pr-10 py-3.5 text-sm outline-none appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                >
                  <option value={5}>5 registros</option>
                  <option value={10}>10 registros</option>
                  <option value={20}>20 registros</option>
                  <option value={50}>50 registros</option>
                  <option value={100}>100 registros</option>
                  <option value={0}>Todos (Deep Scan)</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="pt-2">
              {isRunning ? (
                <button 
                  onClick={handleStop}
                  className="w-full h-14 bg-[#0f172a] hover:bg-red-600 text-white rounded-xl text-[14px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all group"
                >
                  <Square size={18} className="fill-white group-hover:scale-110 transition-transform" /> Parar Processo
                </button>
              ) : (
                <button 
                  onClick={handleStart}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.2)] group"
                >
                  <Play size={18} className="fill-white group-hover:scale-110 transition-transform" /> Iniciar Coleta
                </button>
              )}
            </div>

            {isRunning && (
              <div className="pt-4 space-y-3 border-t border-slate-100 mt-2">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coletados</span>
                    <span className="text-xl font-black text-blue-600">{itemsCollected}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
                    <span className="text-xl font-black text-slate-700">{progress}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-600" 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Console Direito */}
          <div className="flex-1 bg-[#050505] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[560px] relative">
            {/* Header estilo Terminal */}
            <div className="px-6 py-4 bg-[#0A0A0A] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                  SHELL_v4 // {module}
                  {isRunning && <span className="text-emerald-400 animate-pulse ml-2">● EXECUTANDO</span>}
                </span>
              </div>
              <button 
                onClick={() => { setLogs('Console limpo.\n'); setProgress(0); setItemsCollected(0); }}
                className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-slate-800"
              >
                Clear
              </button>
            </div>
            
            <div 
              ref={logRef}
              className="flex-1 p-6 font-mono text-[13px] leading-relaxed overflow-y-auto max-h-[600px] text-slate-400 custom-terminal-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent)]"
            >
              {logs.split('\n').map((line, i) => (
                <div key={i} className={`mb-1.5 ${classifyLog(line)}`}>
                  <span className="break-all opacity-90">{line}</span>
                </div>
              ))}
              {isRunning && <span className="inline-block w-2.5 h-4 bg-blue-500 animate-pulse ml-1 translate-y-1 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            </div>

            {/* Modal de Conclusão / Redirecionamento */}
            <AnimatePresence>
              {isFinished && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 p-8"
                >
                  <div className="bg-white rounded-[2rem] p-10 max-w-[400px] w-full text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Raspagem Concluída!</h3>
                    <p className="text-slate-500 font-medium mb-8">
                      Extração finalizada com sucesso. <br/>
                      <strong className="text-blue-600">{itemsCollected} novos itens</strong> foram processados.
                    </p>
                    
                    <button 
                      onClick={handleGoToModule}
                      className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl group"
                    >
                      Ver Resultados <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">
                      Redirecionando em {countdown} segundos...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-terminal-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-terminal-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-terminal-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 2px solid #050505; }
        .custom-terminal-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
