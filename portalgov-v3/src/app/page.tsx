"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldCheck, ArrowRight, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useMunicipalityStore, Municipality } from '@/store/municipality';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const { setMunicipalities, setCurrentMunicipality } = useMunicipalityStore();
  const [dbMunicipalities, setDbMunicipalities] = useState<Municipality[]>([]);
  const [selectedMun, setSelectedMun] = useState<string>('');
  const [loadingMun, setLoadingMun] = useState(true);

  useEffect(() => {
    const fetchMun = async () => {
      setLoadingMun(true);
      const { data, error } = await supabase.from('tab_municipios').select('id, nome, url_base').order('nome');
      if (data && !error) {
        const formatted = data.map(m => ({ id: m.id, name: m.nome, url: m.url_base }));
        setDbMunicipalities(formatted);
        setMunicipalities(formatted);
        if (formatted.length > 0) setSelectedMun(formatted[0].id);
      }
      setLoadingMun(false);
    };
    fetchMun();
  }, [setMunicipalities]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Usuário padrão solicitado: admin / admin123
    if (username === 'admin' && password === 'admin123') {
      if (!selectedMun) {
        setError('Por favor, selecione um município primeiro.');
        return;
      }
      setCurrentMunicipality(selectedMun);
      router.push('/dashboard');
    } else {
      setError('Credenciais inválidas. Use admin / admin123');
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans overflow-hidden">
      
      {/* ── LADO ESQUERDO: LOGIN ────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-16 relative">
        
        {/* Badge superior */}
        <div className="mb-16">
          <span className="inline-flex items-center px-3 py-1 bg-[#004282] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            PortalGov - Extração de Dados v4
          </span>
        </div>

        {/* Conteúdo Central */}
        <div className="max-w-md my-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[56px] font-bold text-[#003366] leading-[1.1] tracking-tight mb-6"
          >
            Extração de <br />
            <span className="text-[#0055aa]">Dados Públicos</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg leading-relaxed mb-10"
          >
            Nuvem governamental centralizada para extração rotineira e controle de acessos de dados de diário oficial e licitações.
          </motion.p>

          {/* Formulário de Login */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                autoFocus
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input-password')?.focus();
                  }
                }}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                id="input-password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('select-mun')?.focus();
                  }
                }}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
              />
            </div>

            {/* Município Selection */}
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                id="select-mun"
                value={selectedMun}
                onChange={(e) => setSelectedMun(e.target.value)}
                disabled={loadingMun}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!loadingMun && dbMunicipalities.length > 0) {
                      handleLogin(e as any);
                    }
                  }
                }}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 appearance-none disabled:opacity-50"
              >
                {loadingMun ? (
                  <option value="">Carregando municípios...</option>
                ) : dbMunicipalities.length === 0 ? (
                  <option value="">Nenhum município cadastrado</option>
                ) : (
                  dbMunicipalities.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium px-1">{error}</p>
            )}

            <button 
              type="submit"
              disabled={loadingMun || dbMunicipalities.length === 0}
              className={`w-full flex items-center justify-center gap-3 py-4 text-white rounded-xl font-bold transition-all shadow-lg group active:scale-[0.98] ${
                loadingMun || dbMunicipalities.length === 0 
                  ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-[#004a99] hover:bg-[#003d7a] shadow-blue-900/20 cursor-pointer'
              }`}
            >
              <Lock size={18} />
              {loadingMun 
                ? 'Carregando...' 
                : dbMunicipalities.length === 0 
                  ? 'Acesso Bloqueado (Sem Municípios)' 
                  : 'Acesso Restrito Admin'
              }
              {(!loadingMun && dbMunicipalities.length > 0) && (
                <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              )}
            </button>
          </motion.form>
        </div>

        {/* Rodapé Esquerdo */}
        <div className="mt-auto pt-8">
          <p className="text-slate-400 text-xs">
            Sistema protegido por autenticação integrada.
          </p>
        </div>
      </div>

      {/* ── LADO DIREITO: DESTAQUE ──────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-[#001f3f] relative items-center justify-center p-12">
        {/* Pattern de fundo sutil */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
        />
        
        {/* Card Flutuante conforme o print */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#002a54]/60 backdrop-blur-md border border-white/10 rounded-[32px] p-10 shadow-2xl"
        >
          <h3 className="text-slate-300 text-xl font-medium mb-2">Núcleo Central de</h3>
          <h2 className="text-white text-4xl font-bold mb-6 tracking-tight">Gerenciamento</h2>
          
          <p className="text-slate-400 text-sm leading-relaxed mb-12">
            Operação distribuída em tempo real para sincronização de dados oficiais entre os portais municipais.
          </p>

          <div className="flex items-center justify-between pt-6 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              System v4.0.0
            </span>
          </div>
        </motion.div>

        {/* Efeito de luz decorativo */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      </div>

    </div>
  );
}
