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
  { id: 'dashboard', label: 'Monitor Geral',      icon: LayoutDashboard, path: '/',            group: 'principal' },
  { id: 'noticias',  label: 'Notícias & Atos',    icon: Newspaper,       path: '/noticias',    group: 'conteudo' },
  { id: 'lrf',       label: 'Transparência LRF',  icon: FileText,        path: '/lrf',         group: 'conteudo' },
  { id: 'secretarias', label: 'Secretarias',      icon: Building2,       path: '/secretarias', group: 'conteudo' },
  { id: 'config',    label: 'Configurações',       icon: Settings,        path: '/config',      group: 'sistema' },
  { id: 'scraper',   label: 'Console de Raspagem', icon: Activity,        path: '/scraper',     group: 'sistema' },
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
      const { data } = await supabase.from('tab_municipios').select('id, nome').order('nome');
      if (data) {
        setMunicipios(data);
        if (!municipioAtivo && data.length > 0) setMunicipioAtivo(data[0]);
      }
    }
    loadMunicipios();
  }, []);

  const filtered = municipios.filter(m =>
    m.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar">

      {/* ── Branding ── */}
      <div style={{ padding: '1.5rem 1.25rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #0037b0, #1d4ed8)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity size={18} color="#fff" />
          </div>
          <span style={{
            fontSize: '1rem', fontWeight: 700,
            color: '#ffffff', letterSpacing: '-0.02em'
          }}>
            Portalgov
          </span>
        </div>
        <p style={{
          fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace',
          color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase',
          paddingLeft: '2.625rem'
        }}>
          City Hall Blue v6.0
        </p>
      </div>

      {/* ── Divisor ── */}
      <div style={{ height: 1, background: '#1e293b', margin: '0 1.25rem 1rem' }} />

      {/* ── Seletor de Município ── */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem', position: 'relative' }}>
        <p style={{
          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#64748b',
          marginBottom: '0.625rem', paddingLeft: '0.5rem'
        }}>
          Município Ativo
        </p>

        <button
          onClick={() => setDropdownOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid #334155',
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          className="city-selector-trigger"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'rgba(37, 99, 235, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MapPin size={12} color="#3b82f6" />
            </div>
            <span style={{
              fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {municipioAtivo?.nome ?? 'Carregando...'}
            </span>
          </div>
          <ChevronDown
            size={14}
            color="#94a3b8"
            style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0 }}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: 'absolute', left: '0.5rem', right: '0.5rem',
                top: 'calc(100% + 8px)',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 14,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                zIndex: 100,
                overflow: 'hidden'
              }}
            >
              {/* Search */}
              <div style={{ padding: '0.75rem', background: '#1e293b' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                      background: '#0f172a', border: '1px solid #334155',
                      borderRadius: 10, fontSize: '0.8125rem', color: '#f8fafc',
                      outline: 'none', transition: 'border-color 0.2s'
                    }}
                    placeholder="Filtrar município..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              {/* List */}
              <div style={{ maxHeight: 280, overflowY: 'auto', padding: '0.375rem' }}>
                {filtered.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMunicipioAtivo(m); setDropdownOpen(false); setSearchQuery(''); }}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 8, border: 'none',
                      background: municipioAtivo?.id === m.id ? 'rgba(29,78,216,0.18)' : 'transparent',
                      color: municipioAtivo?.id === m.id ? '#1d4ed8' : '#94a3b8',
                      fontSize: '0.8rem', fontWeight: municipioAtivo?.id === m.id ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'background 0.1s'
                    }}
                  >
                    {m.nome}
                    {municipioAtivo?.id === m.id && <ChevronRight size={12} color="#1d4ed8" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navegação ── */}
      <nav style={{ flex: 1, padding: '0 0.75rem' }}>

        {/* Grupo Principal */}
        <p style={{
          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#64748b',
          padding: '0 0.5rem', marginBottom: '0.375rem'
        }}>
          Principal
        </p>
        {MENU_ITEMS.filter(i => i.group === 'principal').map(item => (
          <NavItem key={item.id} item={item} pathname={pathname} router={router} />
        ))}

        <div style={{ height: 1, background: '#1e293b', margin: '1rem 0' }} />

        {/* Grupo Conteúdo */}
        <p style={{
          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#64748b',
          padding: '0 0.5rem', marginBottom: '0.375rem'
        }}>
          Conteúdo
        </p>
        {MENU_ITEMS.filter(i => i.group === 'conteudo').map(item => (
          <NavItem key={item.id} item={item} pathname={pathname} router={router} />
        ))}

        <div style={{ height: 1, background: '#1e293b', margin: '1rem 0' }} />

        {/* Grupo Sistema */}
        <p style={{
          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#64748b',
          padding: '0 0.5rem', marginBottom: '0.375rem'
        }}>
          Sistema
        </p>
        {MENU_ITEMS.filter(i => i.group === 'sistema').map(item => (
          <NavItem key={item.id} item={item} pathname={pathname} router={router} />
        ))}
      </nav>

      {/* ── Footer Status ── */}
      <div style={{
        padding: '1rem 1.25rem',
        borderTop: '1px solid #1e293b',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e'
          }} />
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
            Supabase • Live
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1d4ed8' }}>A</span>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>Admin</p>
            <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Portalgov Elite</p>
          </div>
        </div>
      </div>

    </aside>
  );
}

function NavItem({ item, pathname, router }: { item: any; pathname: string; router: any }) {
  const Icon   = item.icon;
  const active = pathname === item.path;

  return (
    <button
      onClick={() => router.push(item.path)}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.5rem 0.75rem',
        borderRadius: 8, border: 'none',
        background: active ? 'rgba(29,78,216,0.18)' : 'transparent',
        color: active ? '#ffffff' : '#cbd5e1',
        fontSize: '0.8125rem', fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        marginBottom: '0.125rem',
        textAlign: 'left',
        position: 'relative'
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: 0,
          width: 3, height: 20,
          background: '#1d4ed8',
          borderRadius: '0 4px 4px 0'
        }} />
      )}
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      {item.label}
    </button>
  );
}
