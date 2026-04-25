"use client";

import React from 'react';
import { useMunicipalityStore } from '@/store/municipality';
import { MapPin, RefreshCw, User } from 'lucide-react';

export function Header() {
  const { currentMunicipality } = useMunicipalityStore();

  return (
    <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-8 z-30">
      <div className="flex items-center gap-4">
        {currentMunicipality && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <MapPin size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">{currentMunicipality.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw size={14} className="animate-spin-slow" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Sincronizado: Agora mesmo</span>
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 leading-none">Admin</p>
            <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">Gestor Master</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center text-white font-black text-xs">
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
