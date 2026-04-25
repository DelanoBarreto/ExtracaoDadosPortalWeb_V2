"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Newspaper, FileText, Building2, Settings,
  ChevronDown, ChevronRight, MapPin, Search, Activity,
  Gavel, ScrollText, BookOpen, ShoppingCart, Briefcase,
  LogOut, User, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMunicipalityStore } from '@/store/municipality';

// ── Estrutura do Menu (Escalável) ─────────────────────────────────────────────
// Para adicionar novos módulos basta incluir um item neste array.
// groups: grupo de agrupamento colapsável
// children: subitens (aparece dentro do grupo ao expandir)
interface NavItem {
  id:       string;
  label:    string;
  icon:     React.ElementType;
  path:     string;
  badge?:   string;  // ex: "Novo", "Beta"
}

interface NavGroup {
  id:       string;
  label:    string;
  icon:     React.ElementType;
  items:    NavItem[];
  defaultOpen?: boolean;
}

const TOP_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'conteudo',
    label: 'Conteúdo',
    icon: Database,
    defaultOpen: true,
    items: [
      { id: 'noticias',    label: 'Notícias',       icon: Newspaper,    path: '/noticias' },
      { id: 'lrf',         label: 'LRF',            icon: FileText,     path: '/lrf' },
      { id: 'secretarias', label: 'Secretarias',    icon: Building2,    path: '/secretarias' },
    ]
  },
  {
    id: 'raspagem',
    label: 'Módulos de Raspagem',
    icon: Activity,
    defaultOpen: false,
    items: [
      { id: 'scraper',     label: 'Console de Coleta', icon: Activity,     path: '/scraper' },
      { id: 'licitacoes',  label: 'Licitações',     icon: ShoppingCart, path: '/licitacoes',  badge: 'Em breve' },
      { id: 'decretos',    label: 'Decretos',       icon: ScrollText,   path: '/decretos',    badge: 'Em breve' },
      { id: 'atos',        label: 'Atos Oficiais',  icon: Gavel,        path: '/atos',        badge: 'Em breve' },
      { id: 'contratos',   label: 'Contratos',      icon: Briefcase,    path: '/contratos',   badge: 'Em breve' },
      { id: 'legislacao',  label: 'Legislação',     icon: BookOpen,     path: '/legislacao',  badge: 'Em breve' },
    ]
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'configuracoes', label: 'Configurações', icon: Settings, path: '/configuracoes' },
];

// ── Componente ─────────────────────────────────────────────────────────────────
export function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { currentMunicipality, municipalities, setCurrentMunicipality } = useMunicipalityStore();

  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => { init[g.id] = g.defaultOpen ?? false; });
    return init;
  });

  const filtered = municipalities.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isActive = (path: string) => pathname.startsWith(path);

  const NavBtn = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    const isSoon = !!item.badge;
    return (
      <button
        key={item.id}
        disabled={isSoon}
        onClick={() => !isSoon && router.push(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group text-left ${
          active
            ? 'bg-blue-600/10 text-white'
            : isSoon
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <item.icon size={17} className={active ? 'text-blue-400' : isSoon ? 'text-slate-600' : 'group-hover:text-white'} />
        <span className="text-[13px] font-semibold flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span className="text-[9px] font-black bg-white/10 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
            {item.badge}
          </span>
        )}
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute right-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-l-full"
          />
        )}
      </button>
    );
  };

  return (
    <aside className="w-[260px] bg-[#001224] flex flex-col h-screen shrink-0 border-r border-white/[0.04] relative z-40">

      {/* ── Branding ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <MapPin size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-black text-white tracking-tight">PortalGov</span>
          <span className="text-[8px] font-black bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest ml-auto">v4</span>
        </div>

        {/* ── Seletor de Município (Suporta 500+) ───────────────────── */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.08] transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[10px] shrink-0">
              {currentMunicipality?.name?.slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none mb-0.5">Prefeitura Ativa</p>
              <p className="text-[12px] font-bold text-white truncate">
                {currentMunicipality?.name || 'Selecionar...'}
              </p>
            </div>
            <ChevronDown size={13} className={`text-white/20 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-40" />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 overflow-hidden"
                >
                  {/* Busca */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        placeholder={`Buscar entre ${municipalities.length} municípios...`}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-8 pr-3 bg-slate-50 rounded-lg text-[12px] font-medium text-slate-700 outline-none border border-transparent focus:border-blue-100"
                      />
                    </div>
                  </div>
                  {/* Lista */}
                  <div className="max-h-[280px] overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                      <p className="px-4 py-4 text-center text-[11px] text-slate-400 font-medium">
                        Nenhum município encontrado
                      </p>
                    ) : filtered.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setCurrentMunicipality(m.id);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left ${
                          currentMunicipality?.id === m.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <MapPin size={13} className={currentMunicipality?.id === m.id ? 'text-blue-500' : 'text-slate-300'} />
                        <span className="text-[12px] font-semibold">{m.name}</span>
                        {currentMunicipality?.id === m.id && (
                          <span className="ml-auto text-[9px] font-black text-blue-500 uppercase">Ativo</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Footer */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                    <button
                      onClick={() => { setDropdownOpen(false); router.push('/configuracoes'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Settings size={13} />
                      Gerenciar todos os municípios
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Navegação Principal ────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/5">

        {/* Itens fixos do topo (Dashboard) */}
        {TOP_ITEMS.map(item => <NavBtn key={item.id} item={item} />)}

        <div className="h-px bg-white/[0.04] my-3" />

        {/* Grupos Colapsáveis */}
        {NAV_GROUPS.map(group => (
          <div key={group.id} className="space-y-0.5">
            <button
              onClick={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 transition-all"
            >
              <group.icon size={13} />
              <span className="text-[10px] font-black uppercase tracking-widest flex-1 text-left">{group.label}</span>
              {openGroups[group.id]
                ? <ChevronDown size={12} className="shrink-0" />
                : <ChevronRight size={12} className="shrink-0" />
              }
            </button>

            <AnimatePresence>
              {openGroups[group.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pl-2"
                >
                  <div className="space-y-0.5 border-l border-white/[0.05] pl-2 ml-1">
                    {group.items.map(item => <NavBtn key={item.id} item={item} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        <div className="h-px bg-white/[0.04] my-3" />

        {/* Itens do rodapé (Configurações) */}
        {BOTTOM_ITEMS.map(item => <NavBtn key={item.id} item={item} />)}
      </nav>

      {/* ── Footer Usuário ─────────────────────────────────────────────── */}
      <div className="p-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white font-black text-[10px] border border-white/10">
            <User size={14} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white truncate">Admin</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sessão Ativa</p>
          </div>
          <button className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors" title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </div>

    </aside>
  );
}
