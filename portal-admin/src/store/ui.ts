import { create } from 'zustand';

interface UiState {
  isSidebarLocked: boolean;
  setSidebarLocked: (locked: boolean) => void;
  
  // Para auto-save e prompts
  isFormDirty: boolean;
  setFormDirty: (dirty: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarLocked: false,
  setSidebarLocked: (locked) => set({ isSidebarLocked: locked }),
  
  isFormDirty: false,
  setFormDirty: (dirty) => set({ isFormDirty: dirty }),
}));
