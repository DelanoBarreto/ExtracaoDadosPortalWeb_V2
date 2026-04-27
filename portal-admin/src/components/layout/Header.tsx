"use client";

import React from 'react';
import { useMunicipalityStore } from '@/store/municipality';
import { MapPin, RefreshCw, ChevronDown } from 'lucide-react';

export function Header() {
  const { currentMunicipality, municipalities, setCurrentMunicipality } = useMunicipalityStore();

  return (
    <header className="h-14 border-b border-slate-100 bg-white z-30">
      <div className="max-w-7xl w-full h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <select
              value={currentMunicipality?.id || ''}
              onChange={(e) => setCurrentMunicipality(e.target.value)}
              className="appearance-none w-48 flex items-center gap-2 pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            >
              <option value="" disabled>Selecione um município</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <MapPin size={14} className="text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown size={14} className="text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-blue-500 transition-colors" />
          </div>
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
      </div>
    </header>
  );
}
