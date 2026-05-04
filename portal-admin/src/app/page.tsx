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
    <div className="flex min-h-screen bg-white font-sans overflow-hidden">
      {/* ── LADO ESQUERDO: LOGIN ─────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-16 relative">

        {/* Badge superior */}
        <div className="mb-16">
          <span className="inline-flex items-center px-3 py-1 bg-[#004282] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            PortalGov — Área Administrativa v4
          </span>
        </div>

        {/* Conteúdo Central */}
        <div className="max-w-md my-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[48px] font-bold text-[#003366] leading-[1.1] tracking-tight mb-4"
          >
            Gestão de <br />
            <span className="text-[#0055aa]">Dados Públicos</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-base leading-relaxed mb-10"
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
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 text-[14px]"
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
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 text-[14px]"
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
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 text-[14px] appearance-none disabled:opacity-50 cursor-pointer"
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
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="flex-shrink-0" />
                <p className="text-[13px] font-medium">{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              tabIndex={4}
              disabled={loading || loadingMun || !email || !password || !selectedMun}
              className="w-full flex items-center justify-center gap-3 py-4 text-white rounded-xl font-bold transition-all shadow-lg group active:scale-[0.98] bg-[#004a99] hover:bg-[#003d7a] shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#004a99] mt-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Verificando acesso...</>
              ) : (
                <>
                  <Lock size={18} />
                  Acessar Painel Admin
                  <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </>
              )}
            </button>
          </motion.form>
        </div>

        {/* Rodapé */}
        <div className="mt-auto pt-8">
          <p className="text-slate-400 text-xs">
            Sistema protegido por autenticação. Acesso restrito a usuários autorizados.
          </p>
        </div>
      </div>

      {/* ── LADO DIREITO: VISUAL ─────────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-[#001f3f] relative items-center justify-center p-12">
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
        />

        {/* Card flutuante */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
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

        {/* Luz decorativa */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
}
