import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Municipality {
  id: string;
  name: string;
  url: string;
}

interface MunicipalityStore {
  currentMunicipality: Municipality | null;
  municipalities: Municipality[];
  setCurrentMunicipality: (id: string) => void;
  addMunicipality: (municipality: Municipality) => void;
  updateMunicipality: (municipality: Municipality) => void;
  removeMunicipality: (id: string) => void;
  setMunicipalities: (municipalities: Municipality[]) => void;
}

export const useMunicipalityStore = create<MunicipalityStore>()(
  persist(
    (set) => ({
      currentMunicipality: null,
      municipalities: [],
      setCurrentMunicipality: (id) =>
        set((state) => ({
          currentMunicipality: state.municipalities.find((m) => m.id === id) || null,
        })),
      addMunicipality: (municipality) =>
        set((state) => ({
          municipalities: [...state.municipalities, municipality],
        })),
      updateMunicipality: (municipality) =>
        set((state) => ({
          municipalities: state.municipalities.map((m) =>
            m.id === municipality.id ? municipality : m
          ),
          currentMunicipality: state.currentMunicipality?.id === municipality.id ? municipality : state.currentMunicipality,
        })),
      removeMunicipality: (id) =>
        set((state) => ({
          municipalities: state.municipalities.filter((m) => m.id !== id),
          currentMunicipality: state.currentMunicipality?.id === id ? null : state.currentMunicipality,
        })),
      setMunicipalities: (municipalities) =>
        set((state) => {
          let updatedCurrent = null;
          
          if (state.currentMunicipality) {
            // Tenta encontrar pelo ID (mais seguro)
            updatedCurrent = municipalities.find(m => m.id === state.currentMunicipality?.id);
            
            // Se não encontrou pelo ID, tenta pelo NOME (fallback para quando o banco foi resetado/re-seed)
            if (!updatedCurrent && state.currentMunicipality.name) {
              updatedCurrent = municipalities.find(m => m.name === state.currentMunicipality?.name);
            }
          }
          
          return {
            municipalities,
            currentMunicipality: updatedCurrent || municipalities[0] || null
          };
        }),
    }),
    {
      name: 'municipality-storage',
    }
  )
);
