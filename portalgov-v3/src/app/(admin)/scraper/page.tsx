"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePortalStore } from '@/store/usePortalStore';
import { createClient } from '@supabase/supabase-js';
import { Play, Square, ChevronDown, CheckCircle2, ArrowRight, Copy, Check, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Municipio {
  id: string;
  nome: string;
  url_base: string;
  ativo: boolean;
}

export default function ScraperPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { municipioAtivo, setMunicipioAtivo } = usePortalStore();

  const [logs, setLogs] = useState('Engine: Node.js/Playwright | v4.0.0\nAguardando comandos...');
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [module, setModule] = useState(searchParams.get('module') || 'noticias');
  const [limit, setLimit] = useState(20);
  const [progress, setProgress] = useState(0);
  const [itemsCollected, setItemsCollected] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [copied, setCopied] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [selectedMunicipioId, setSelectedMunicipioId] = useState<string>(
    municipioAtivo?.id?.toString() || ''
  );

  const logRef = useRef<HTMLDivElement>(null);
  const lastLogsRef = useRef('');

  // Load municipalities from Supabase
  useEffect(() => {
    supabase
      .from('tab_municipios')
      .select('id, nome, url_base, ativo')
      .order('nome')
      .then(({ data }) => {
        if (data) setMunicipios(data);
      });
  }, []);

  // Sync selectedMunicipioId when municipioAtivo changes externally (e.g., from sidebar)
  useEffect(() => {
    if (municipioAtivo?.id) {
      setSelectedMunicipioId(municipioAtivo.id.toString());
    }
  }, [municipioAtivo]);

  // Derived: currently selected municipio object
  const selectedMunicipio = municipios.find(m => m.id.toString() === selectedMunicipioId) || municipioAtivo;

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

            const progMatch = data.logs.match(/(\d+)%/g);
            if (progMatch) {
              const lastMatch = progMatch[progMatch.length - 1];
              setProgress(parseInt(lastMatch));
            }

            const ratioMatch = data.logs.match(/\[(\d+)\/(\d+)\]/g);
            if (ratioMatch) {
              const lastRatio = ratioMatch[ratioMatch.length - 1];
              const parts = lastRatio.match(/\[(\d+)\/(\d+)\]/);
              if (parts) {
                const current = parseInt(parts[1]);
                const total = parseInt(parts[2]);
                if (total > 0 && total !== Infinity) {
                  setProgress(Math.round((current / total) * 100));
                }
              }
            }

            const successCount = (data.logs.match(/(✅|🔄)\s*(Salvo|Sucesso|Inserido|Novas partes salvas|Atualizado)/gi) || []).length;
            setItemsCollected(successCount);

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

  const handleMunicipioChange = (id: string) => {
    setSelectedMunicipioId(id);
    const found = municipios.find(m => m.id.toString() === id);
    if (found) setMunicipioAtivo(found);
  };

  const handleStart = async () => {
    if (!selectedMunicipio) {
      alert('Selecione um município antes de iniciar a raspagem.');
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
        body: JSON.stringify({ modulo: module, municipio_id: selectedMunicipio.id, limit })
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

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const classifyLog = (line: string) => {
    if (line.includes('❌') || line.toLowerCase().includes('erro')) return 'text-red-400';
    if (line.includes('✅') || line.includes('🏁') || line.toLowerCase().includes('sucesso')) return 'text-emerald-400 font-bold';
    if (line.includes('🚀')) return 'text-blue-400 font-bold';
    if (line.includes('📄') || line.includes('⏳')) return 'text-amber-300';
    return 'text-slate-400';
  };

  const hasError = logs.includes('❌') || logs.toLowerCase().includes('erro');

  return (
    <div className="flex-1 p-5 bg-slate-50 min-h-full">
      <div className="max-w-[1200px]">

        {/* Header compacto — sem card "Alvo Ativo" */}
        <div className="mb-5">
          <h1 className="text-[22px] font-black text-[#0F172A] mb-0.5 tracking-tight">Console de Raspagem</h1>
          <p className="text-[13px] font-bold text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Portalgov Automated Engine v4.2 Elite
          </p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Painel de Controle */}
          <div className="w-[300px] bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-5 shrink-0">

            {/* ── Município Alvo ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                <MapPin size={11} className="text-blue-500" />
                Prefeitura Alvo
              </label>
              <div className="relative">
                <select
                  value={selectedMunicipioId}
                  onChange={e => handleMunicipioChange(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-slate-50 border border-blue-200 text-slate-900 rounded-xl pl-4 pr-10 py-3 text-sm outline-none appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                >
                  <option value="">— Selecione a prefeitura —</option>
                  {municipios.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
              </div>
              {selectedMunicipio && (
                <p className="text-[11px] text-slate-400 font-medium truncate pl-1">
                  🌐 {selectedMunicipio.url_base}
                </p>
              )}
            </div>

            {/* ── Módulo Alvo ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Módulo Alvo</label>
              <div className="relative">
                <select
                  value={module}
                  onChange={e => setModule(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-4 pr-10 py-3 text-sm outline-none appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                >
                  <option value="noticias">Notícias</option>
                  <option value="lrf">Transparência LRF</option>
                  <option value="secretarias">Secretarias</option>
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* ── Limite de Coleta ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Limite de Coleta</label>
              <div className="relative">
                <select
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-4 pr-10 py-3 text-sm outline-none appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                >
                  <option value={5}>5 registros</option>
                  <option value={10}>10 registros</option>
                  <option value={20}>20 registros</option>
                  <option value={50}>50 registros</option>
                  <option value={100}>100 registros</option>
                  <option value={0}>Todos (Deep Scan)</option>
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* ── Botão de ação ── */}
            <div>
              {isRunning ? (
                <button
                  onClick={handleStop}
                  className="w-full h-12 bg-[#0f172a] hover:bg-red-600 text-white rounded-xl text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all group"
                >
                  <Square size={16} className="fill-white group-hover:scale-110 transition-transform" /> Parar Processo
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={!selectedMunicipio}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] group"
                >
                  <Play size={16} className="fill-white group-hover:scale-110 transition-transform" /> Iniciar Coleta
                </button>
              )}
            </div>

            {/* ── Progress (only while running) ── */}
            {isRunning && (
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
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
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Console Terminal */}
          <div className="flex-1 bg-[#050505] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[520px] relative">

            {/* Terminal Header */}
            <div className="px-5 py-3.5 bg-[#0A0A0A] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                  SHELL_v4 // {module}
                  {isRunning && <span className="text-emerald-400 animate-pulse ml-2">● EXECUTANDO</span>}
                </span>
              </div>

              {/* Ações do terminal */}
              <div className="flex items-center gap-2">
                {/* Botão Copiar Logs — destaque em vermelho quando há erro */}
                <button
                  onClick={handleCopyLogs}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors px-3 py-1.5 rounded-lg border ${
                    hasError
                      ? 'text-red-400 hover:text-white border-red-800 hover:bg-red-600/20 hover:border-red-600'
                      : 'text-slate-600 hover:text-white border-transparent hover:bg-white/5 hover:border-slate-800'
                  }`}
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  {copied ? 'Copiado!' : hasError ? 'Copiar Erro' : 'Copiar'}
                </button>

                <button
                  onClick={() => { setLogs('Console limpo.\n'); setProgress(0); setItemsCollected(0); }}
                  className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-slate-800"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Log output */}
            <div
              ref={logRef}
              className="flex-1 p-5 font-mono text-[13px] leading-relaxed overflow-y-auto max-h-[540px] text-slate-400 custom-terminal-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent)]"
            >
              {logs.split('\n').map((line, i) => (
                <div key={i} className={`mb-1.5 ${classifyLog(line)}`}>
                  <span className="break-all opacity-90">{line}</span>
                </div>
              ))}
              {isRunning && <span className="inline-block w-2.5 h-4 bg-blue-500 animate-pulse ml-1 translate-y-1 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            </div>

            {/* Modal de Conclusão */}
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
                      Extração finalizada com sucesso. <br />
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
        .custom-terminal-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-terminal-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-terminal-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 2px solid #050505; }
        .custom-terminal-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
