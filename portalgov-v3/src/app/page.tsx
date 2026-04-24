"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Usuário padrão solicitado: admin / admin123
    if (username === 'admin' && password === 'admin123') {
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
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium px-1">{error}</p>
            )}

            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-4 bg-[#004a99] text-white rounded-xl font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-blue-900/20 group active:scale-[0.98]"
            >
              <Lock size={18} />
              Acesso Restrito Admin
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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
