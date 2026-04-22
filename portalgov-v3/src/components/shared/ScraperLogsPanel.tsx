"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Play, 
  Terminal, 
  Pause, 
  CheckCircle2, 
  Loader2, 
  CircleStop, 
  Hash,
  Database
} from 'lucide-react';
import { usePortalStore } from '@/store/usePortalStore';
import axios from 'axios';

interface ScraperLogsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  modulo?: string;
}

export function ScraperLogsPanel({ isOpen, onClose, modulo = 'noticias' }: ScraperLogsPanelProps) {
  const { municipioAtivo } = usePortalStore();
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);
  const [limit, setLimit] = useState(20);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Status e Logs
  const { data: logStatus, refetch } = useQuery({
    queryKey: ['scrape-logs'],
    queryFn: async () => {
      const res = await fetch('/api/scrape');
      return res.json();
    },
    refetchInterval: isOpen ? 2000 : false,
  });

  // Iniciar Raspagem
  const startScrape = async () => {
    if (!municipioAtivo) return;
    setIsStarting(true);
    try {
      await axios.post('/api/scrape', {
        modulo,
        municipio_id: municipioAtivo.id,
        limit
      });
      refetch();
    } catch (err) {
      console.error('Erro ao iniciar raspagem:', err);
    } finally {
      setIsStarting(false);
    }
  };

  // Abortar Raspagem
  const abortScrape = async () => {
    try {
      await axios.delete('/api/scrape');
      refetch();
    } catch (err) {
      console.error('Erro ao abortar:', err);
    }
  };

  // Limpeza de Dados (Elite Tool)
  const clearData = async () => {
    if (confirm(`⚠️ ATENÇÃO: Isso apagará TODOS os registros de ${modulo} e seus arquivos de imagem no storage para este município. Confirmar?`)) {
      try {
        await axios.post('/api/items/clear', { 
          table: modulo === 'noticias' ? 'tab_noticias' : 'tab_lrf',
          municipio_id: municipioAtivo?.id 
        });
        queryClient.invalidateQueries({ queryKey: [modulo === 'noticias' ? 'tab_noticias' : 'tab_lrf'] });
        alert('Dados limpos com sucesso.');
      } catch (err) {
        alert('Erro ao limpar dados.');
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logStatus?.logs]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-[450px] bg-white shadow-2xl z-[101] flex flex-col border-l border-gray-200"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-900 rounded-lg text-white">
                  <Terminal size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">V4 Scraper Engine</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Status reativo por PID</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
               <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Quantidade de Coleta</label>
                    <div className="grid grid-cols-4 gap-2">
                       {[5, 10, 20, 100].map((q) => (
                         <button 
                            key={q}
                            onClick={() => setLimit(q)}
                            disabled={logStatus?.isRunning}
                            className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                              limit === q 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                              : 'bg-white border-blue-200 text-blue-600 hover:border-blue-400'
                            } disabled:opacity-30`}
                         >
                           {q === 100 ? 'Tudo' : q}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-4 pt-4 border-t border-blue-100">
                     <span className="text-blue-500 font-medium">Município:</span>
                     <span className="text-blue-900 font-bold uppercase tracking-tight">{municipioAtivo?.nome || 'Não selecionado'}</span>
                  </div>

                  <div className="flex gap-2">
                    {!logStatus?.isRunning ? (
                      <button 
                        onClick={startScrape}
                        disabled={isStarting || !municipioAtivo}
                        className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                      >
                        {isStarting ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                        Iniciar Raspagem
                      </button>
                    ) : (
                      <button 
                        onClick={abortScrape}
                        className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-100 animate-pulse"
                      >
                        <CircleStop size={18} />
                        Abortar Coleta
                      </button>
                    )}
                    
                    <button 
                      onClick={clearData}
                      disabled={logStatus?.isRunning}
                      className="p-3 bg-white border border-red-100 text-red-500 rounded-2xl hover:bg-red-50 transition-colors disabled:opacity-30"
                      title="Limpar todos os dados deste módulo"
                    >
                      <Database size={18} />
                    </button>
                  </div>
               </div>
            </div>

            <div className="flex-1 flex flex-col px-6 pb-6 min-h-0">
               <div className="flex-1 bg-gray-950 rounded-3xl p-5 overflow-hidden flex flex-col font-mono text-[11px] relative shadow-inner border-[6px] border-gray-900">
                  <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                     <div className="w-2 h-2 rounded-full bg-red-500" />
                     <div className="w-2 h-2 rounded-full bg-yellow-500" />
                     <div className="w-2 h-2 rounded-full bg-green-500" />
                     <span className="text-white/30 ml-2">v4-engine-output</span>
                     {logStatus?.isRunning && (
                       <span className="ml-auto text-emerald-500 flex items-center gap-1 animate-pulse">
                         <Hash size={10} /> {modulo.toUpperCase()} ACTIVE
                       </span>
                     )}
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 text-gray-300 custom-scrollbar">
                    {logStatus?.logs ? (
                      logStatus.logs.split('\n').map((line: string, i: number) => {
                        let color = 'text-gray-400';
                        if (line.includes('🚀')) color = 'text-blue-400 font-bold';
                        if (line.includes('✅')) color = 'text-emerald-400 font-bold';
                        if (line.includes('🛑')) color = 'text-red-400 font-bold';
                        if (line.includes('⚠️')) color = 'text-amber-400';
                        
                        return <div key={i} className={`${color} leading-relaxed`}>{line}</div>;
                      })
                    ) : (
                      <div className="text-gray-700 italic">Pronto para iniciar...</div>
                    )}
                  </div>
               </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-between text-[10px]">
               <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest">
                  <CheckCircle2 size={12} /> Scraper Ativo
               </div>
               <div className="text-gray-400 font-medium">Next.js 14 + TipTap Cloud</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
