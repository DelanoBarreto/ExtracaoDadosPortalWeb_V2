"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Building2,
  Settings,
  ChevronDown,
  MapPin,
  Search,
  LogOut,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { usePortalStore } from '@/store/usePortalStore';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard, path: '/dashboard' },
  { id: 'noticias',  label: 'Notícias',          icon: Newspaper,       path: '/noticias' },
  { id: 'lrf',       label: 'LRF',               icon: FileText,        path: '/lrf' },
  { id: 'atos',      label: 'Atos Oficiais',     icon: FileText,        path: '/noticias' }, // Redirecionando para noticias por enquanto
  { id: 'secretarias', label: 'Secretarias',     icon: Building2,       path: '/secretarias' },
  { id: 'config',    label: 'Configurações',      icon: Settings,        path: '/config' },
  { id: 'scraper',   label: 'Console de Raspagem', icon: Activity,        path: '/scraper', customColor: '#f87171' },
];

export function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { municipioAtivo, setMunicipioAtivo } = usePortalStore();

  const [municipios,   setMunicipios]   = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  useEffect(() => {
    async function loadMunicipios() {
      const { data } = await supabase.from('tab_municipios').select('id, nome, url_base').order('nome');
      if (data) {
        setMunicipios(data);
        if (!municipioAtivo && data.length > 0) setMunicipioAtivo(data[0]);
      }
    }
    loadMunicipios();
  }, [setMunicipioAtivo, municipioAtivo]);

  const filtered = municipios.filter(m =>
    m.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar" style={{ background: '#001a41', width: '260px', display: 'flex', flexDirection: 'column' }}>

      {/* ── Branding ── */}
      <div style={{ padding: '2rem 1.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{
            fontSize: '1.25rem', fontWeight: 800,
            color: '#ffffff', letterSpacing: '-0.02em'
          }}>
            PortalGov
          </span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700,
            background: 'rgba(37, 99, 235, 0.2)',
            color: '#60a5fa',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(37, 99, 235, 0.4)',
            textTransform: 'uppercase'
          }}>
            V4 ELITE
          </span>
        </div>

        {/* ── Seletor de Município ── */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '8px',
              background: '#3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '10px', fontWeight: 900
            }}>
              {municipioAtivo?.nome?.slice(0, 2).toUpperCase() || '??'}
            </div>
            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Prefeitura</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {municipioAtivo?.nome || 'Selecionar...'}
              </p>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div 
                  onClick={() => setDropdownOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                    background: '#ffffff', borderRadius: '14px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                    zIndex: 50, padding: '0.5rem',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ padding: '0.5rem', position: 'relative' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      autoFocus
                      placeholder="Buscar município..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem',
                        fontSize: '12px', border: '1px solid #f1f5f9',
                        borderRadius: '8px', outline: 'none', background: '#f8fafc'
                      }}
                    />
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {filtered.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMunicipioAtivo(m);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        style={{
                          width: '100%', padding: '0.65rem 0.75rem',
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          border: 'none', background: municipioAtivo?.id === m.id ? '#eff6ff' : 'transparent',
                          borderRadius: '8px', cursor: 'pointer', textAlign: 'left'
                        }}
                      >
                        <MapPin size={14} color={municipioAtivo?.id === m.id ? '#3b82f6' : '#94a3b8'} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                          {m.nome}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Navegação ── */}
      <nav style={{ flex: 1, padding: '1rem 0' }}>
        {MENU_ITEMS.map(item => (
          <NavItem key={item.id} item={item} pathname={pathname} router={router} />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: '1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#fff' }}>A</span>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>Admin Elite</p>
            <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
              v15.1.0-LTS
            </p>
          </div>
        </div>
      </div>

    </aside>
  );
}

function NavItem({ item, pathname, router }: { item: any; pathname: string; router: any }) {
  const active = pathname === item.path;
  const Icon = item.icon;

  return (
    <button
      onClick={() => router.push(item.path)}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.85rem 1.5rem',
        border: 'none',
        background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
        color: active ? '#ffffff' : (item.customColor || '#94a3b8'),
        fontSize: '0.875rem', fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        textAlign: 'left'
      }}
    >
      <Icon size={18} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {active && (
        <motion.div 
          layoutId="active-pill"
          style={{
            position: 'absolute', right: 0, top: '20%', bottom: '20%',
            width: '4px',
            background: '#3b82f6',
            borderRadius: '4px 0 0 4px'
          }} 
        />
      )}
    </button>
  );
}
