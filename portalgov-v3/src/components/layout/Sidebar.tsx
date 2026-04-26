"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MapPin, Search, User, LogOut, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMunicipalityStore } from '@/store/municipality';

interface NavItem {
  id: string;
  label: string;
  path: string;
  color?: string; // Para o console de raspagem, por exemplo
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'noticias', label: 'Notícias', path: '/noticias' },
  { id: 'lrf', label: 'LRF', path: '/lrf' },
  { id: 'atos', label: 'Atos Oficiais', path: '/atos' },
  { id: 'secretarias', label: 'Secretarias', path: '/secretarias' },
  { id: 'configuracoes', label: 'Configurações', path: '/configuracoes' },
  { id: 'scraper', label: 'Console de Raspagem', path: '/scraper', color: 'text-rose-300' },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentMunicipality, municipalities, setCurrentMunicipality } = useMunicipalityStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = municipalities.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isActive = (path: string) => pathname.startsWith(path);

  const NavBtn = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.id}
        onClick={() => router.push(item.path)}
        className={`w-full flex items-center px-6 py-2.5 transition-all relative text-left cursor-pointer ${
          active
            ? 'bg-[#153B6A] text-white font-bold'
            : `text-slate-300 hover:text-white hover:bg-white/5 font-medium ${item.color || ''}`
        }`}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400"
          />
        )}
        <span className="text-[14px]">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="w-[260px] bg-[#07264D] flex flex-col h-screen shrink-0 border-r border-white/10 relative z-40">
      
      {/* ── Branding ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[20px] font-bold text-white tracking-tight">Portal<span className="text-white">Gov</span></span>
          <span className="text-[10px] font-bold border border-blue-400 text-blue-400 px-1.5 py-0.5 rounded tracking-wide ml-2">EXTRAÇÃO</span>
          <span className="text-[10px] font-bold bg-white/10 text-white/70 px-1.5 py-0.5 rounded ml-1">v4.0</span>
        </div>
      </div>

      {/* ── Navegação Principal ────────────────────────────────────────── */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {NAV_ITEMS.map(item => <NavBtn key={item.id} item={item} />)}
      </nav>

      {/* ── Footer: Município e Usuário ───────────────────────────────── */}
      <div className="mt-auto border-t border-white/5 bg-[#051C3A]">
        {/* Seletor de Município */}
        <div className="relative border-b border-white/5">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex flex-col p-3 hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Prefeitura Ativa</span>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-white truncate pr-2">
                {currentMunicipality?.name || 'Selecionar Município'}
              </span>
              <MapPin size={14} className="text-white/40 shrink-0" />
            </div>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-40" />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-2xl z-50 border border-slate-100 overflow-hidden"
                >
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-8 pr-3 bg-slate-50 rounded-lg text-[12px] font-medium text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                      <p className="px-4 py-4 text-center text-[11px] text-slate-400">Nenhum encontrado</p>
                    ) : filtered.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setCurrentMunicipality(m.id);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer ${
                          currentMunicipality?.id === m.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-[12px] font-semibold">{m.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Usuário logado */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <User size={14} className="text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate">Admin</p>
            <p className="text-[10px] text-slate-400">Sessão Ativa</p>
          </div>
          <button className="text-white/40 hover:text-white transition-colors cursor-pointer" title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </div>

    </aside>
  );
}
