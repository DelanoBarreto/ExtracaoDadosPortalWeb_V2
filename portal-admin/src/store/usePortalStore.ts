import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PortalState {
  municipioAtivo: any | null; // Nome unificado para todas as páginas
  logPanelOpen: boolean;
  activeModule: string;
  setMunicipioAtivo: (municipio: any) => void;
  setLogPanelOpen: (open: boolean) => void;
  setActiveModule: (module: string) => void;
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set) => ({
      municipioAtivo: null,
      logPanelOpen: false, // GAP 9 CORRIGIDO: não abre automaticamente
      activeModule: 'dashboard',
      setMunicipioAtivo: (municipio) => set({ municipioAtivo: municipio }),
      setLogPanelOpen: (open) => set({ logPanelOpen: open }),
      setActiveModule: (module) => set({ activeModule: module }),
    }),
    {
      name: 'portalgov-storage',
    }
  )
);
