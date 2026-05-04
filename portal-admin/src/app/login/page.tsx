"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-mail ou senha inválidos. Verifique e tente novamente.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f4d] via-[#003380] to-[#004c99] flex items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-[32px] shadow-2xl shadow-black/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#003380] to-[#004c99] px-10 py-10 text-center">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
              <ShieldCheck size={32} className="text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">PortalGov Admin</h1>
            <p className="text-white/60 text-[13px] font-medium">Área restrita — acesso autorizado</p>
          </div>

          {/* Form */}
          <div className="px-10 py-10">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  tabIndex={1}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('login-password')?.focus()}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-[#004c99] focus:ring-2 focus:ring-[#004c99]/10 transition-all"
                />
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    tabIndex={2}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-12 pl-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-[#004c99] focus:ring-2 focus:ring-[#004c99]/10 transition-all"
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
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <p className="text-[13px] font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                tabIndex={3}
                disabled={loading || !email || !password}
                className="w-full h-12 bg-[#004c99] hover:bg-[#003366] text-white rounded-xl text-[14px] font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Entrando...</>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 font-medium mt-8">
              Acesso restrito a usuários autorizados.<br />
              Em caso de problemas, contate o administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
