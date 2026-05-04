"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@supabase/ssr';
import { useMunicipalityStore, Municipality } from '@/store/municipality';

export default function LoginPage() {
  const router = useRouter();
  const { setMunicipalities, setCurrentMunicipality } = useMunicipalityStore();

  const [email, setEmail] = useState('admin@portalgov.com');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [selectedMun, setSelectedMun] = useState('');
  const [municipalities, setMunicipalitiesLocal] = useState<Municipality[]>([]);
  const [loadingMun, setLoadingMun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchMun = async () => {
      setLoadingMun(true);
      const { data } = await supabase
        .from('tab_municipios')
        .select('id, nome, url_base')
        .order('nome');

      if (data) {
        const formatted: Municipality[] = data.map(m => ({
          id: m.id,
          name: m.nome,
          url: m.url_base,
        }));
        setMunicipalitiesLocal(formatted);
        setMunicipalities(formatted);
        if (formatted.length > 0) setSelectedMun(formatted[0].id);
      }
      setLoadingMun(false);
    };
    fetchMun();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMun) {
      setError('Selecione um município para continuar.');
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('E-mail ou senha inválidos. Use: admin@portalgov.com · senha: admin123');
      setLoading(false);
      return;
    }

    setCurrentMunicipality(selectedMun);
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans items-center justify-center p-6 lg:p-12 selection:bg-blue-500/30">
      
      {/* ── CARD CENTRALIZADO ── */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row bg-white rounded-[32px] shadow-2xl shadow-blue-900/10 overflow-hidden relative">
        
        {/* ── LADO ESQUERDO: LOGIN (Branco) ── */}
        <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-14 relative z-10">
          
          {/* Badge superior */}
          <div className="mb-10">
            <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-[#004282] text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-100">
              PortalGov — Área Administrativa v4
            </span>
          </div>

          {/* Conteúdo Central */}
          <div className="max-w-sm my-auto mx-auto lg:mx-0 w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[40px] font-bold text-[#003366] leading-[1.1] tracking-tight mb-4"
            >
              Gestão de <br />
              <span className="text-[#0055aa]">Dados Públicos</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500 text-[14px] leading-relaxed mb-8"
            >
              Painel centralizado para administração, publicação e controle
              dos dados municipais do PortalGov.
            </motion.p>

            {/* Formulário */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              {/* E-mail */}
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="login-email"
                  type="email"
                  tabIndex={1}
                  autoFocus
                  placeholder="E-mail de acesso"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('login-password')?.focus()}
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#004282] transition-all text-slate-700 text-[14px]"
                />
              </div>

              {/* Senha */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  tabIndex={2}
                  placeholder="Senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('select-mun')?.focus()}
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#004282] transition-all text-slate-700 text-[14px]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Município */}
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  id="select-mun"
                  tabIndex={3}
                  value={selectedMun}
                  onChange={e => setSelectedMun(e.target.value)}
                  disabled={loadingMun}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#004282] transition-all text-slate-700 text-[14px] appearance-none disabled:opacity-50 cursor-pointer"
                >
                  {loadingMun ? (
                    <option value="">Carregando municípios...</option>
                  ) : municipalities.length === 0 ? (
                    <option value="">Nenhum município cadastrado</option>
                  ) : (
                    municipalities.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <p className="text-[13px] font-medium">{error}</p>
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                tabIndex={4}
                disabled={loading || loadingMun || !email || !password || !selectedMun}
                className="w-full flex items-center justify-center gap-2 py-4 text-white rounded-2xl font-bold transition-all shadow-lg group active:scale-[0.98] bg-[#789dca] hover:bg-[#6b8cb7] shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-[15px]"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Verificando acesso...</>
                ) : (
                  <>
                    Entrar no Sistema
                  </>
                )}
              </button>
            </motion.form>
          </div>

          {/* Rodapé */}
          <div className="mt-auto pt-8">
            <p className="text-slate-400 text-xs text-center">
              Acesso restrito a usuários autorizados.<br/>
              Em caso de problemas, contate o administrador.
            </p>
          </div>
        </div>

        {/* ── LADO DIREITO: VISUAL (Azul Pro Max) ── */}
        <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12 overflow-hidden bg-[#002a54]">
          {/* Fundo com Gradiente Dinâmico */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#003366] via-[#004282] to-[#001f3f]" />

          {/* Padrão de Cruzes (Cross Pattern) animado levemente */}
          <motion.div 
            animate={{ backgroundPosition: ['0px 0px', '60px 60px'] }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
            className="absolute inset-0 opacity-15 mix-blend-overlay" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} 
          />

          {/* Orbes de Luz Flutuantes (Efeito Pro Max) */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              y: [0, -20, 0]
            }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/30 blur-[80px] rounded-full pointer-events-none" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
              x: [0, 30, 0]
            }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/20 blur-[100px] rounded-full pointer-events-none" 
          />

          {/* Card interno (Glassmorphism Avançado) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="w-full max-w-sm relative z-10"
          >
            {/* Camada de vidro e bordas refinadas */}
            <div className="absolute inset-0 bg-[#001f3f]/50 backdrop-blur-2xl rounded-[32px] border border-white/20 shadow-[0_0_60px_rgba(0,150,255,0.2)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-60" />
            </div>

            {/* Conteúdo do Card */}
            <div className="relative p-10">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="text-blue-300 text-[16px] font-medium mb-3 uppercase tracking-widest drop-shadow-md"
              >
                Núcleo Central de
              </motion.h3>
              
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-50 to-blue-200 text-[42px] leading-none font-black mb-6 tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]"
              >
                Gerenciamento
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-white/90 text-[15px] font-light leading-relaxed mb-10 drop-shadow-sm"
              >
                Operação distribuída em tempo real para sincronização de dados oficiais entre os portais municipais.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-between pt-6 border-t border-white/20"
              >
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-inner backdrop-blur-md">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Secure</span>
                </div>
                
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest bg-[#004282]/80 px-4 py-2 rounded-full border border-blue-400/30 shadow-[0_0_10px_rgba(0,66,130,0.5)]">
                  System v4.0.0
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
