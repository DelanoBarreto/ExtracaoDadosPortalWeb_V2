"use client";

import React, { useEffect, useState } from 'react';
import { useMunicipalityStore } from '@/store/municipality';
import { MapPin, ChevronDown, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export function Header() {
  const { currentMunicipality, municipalities, setCurrentMunicipality } = useMunicipalityStore();
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const isEditPage = pathname?.includes('/edit') || pathname?.endsWith('/new');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Exibe iniciais do email (ex: "de" de delano@email.com)
  const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'AD';

  return (
    <header className="h-14 border-b border-slate-100 bg-white z-30">
      <div className="max-w-7xl w-full h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`relative ${!isEditPage ? 'group' : ''}`}>
            <select
              value={currentMunicipality?.id || ''}
              onChange={(e) => setCurrentMunicipality(e.target.value)}
              disabled={isEditPage}
              className={`appearance-none w-48 flex items-center gap-2 pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none transition-all shadow-sm ${
                isEditPage 
                  ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200' 
                  : 'hover:border-blue-300 focus:ring-2 focus:ring-blue-100 cursor-pointer'
              }`}
            >
              <option value="" disabled>Selecione um município</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <MapPin size={14} className={`${isEditPage ? 'text-slate-400' : 'text-blue-600'} absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none`} />
            <ChevronDown size={14} className={`text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${!isEditPage ? 'group-hover:text-blue-500' : ''}`} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900 leading-none truncate max-w-[160px]">
                {userEmail || 'Admin'}
              </p>
              <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">Gestor Master</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center text-white font-black text-xs">
              {initials}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sair do sistema"
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all border border-transparent hover:border-red-100"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
