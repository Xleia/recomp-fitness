import { create } from 'zustand';
import type { RecompState } from '../types/state';

type AppStore = {
  vault: RecompState | null;
  unlocked: boolean;
  screen: 'home' | 'workout' | 'plans' | 'nutrition' | 'progress' | 'settings';
  setVault: (vault: RecompState | null) => void;
  setScreen: (screen: AppStore['screen']) => void;
};
export const useAppStore = create<AppStore>((set) => ({
  vault: null,
  unlocked: false,
  screen: 'home',
  setVault: (vault) => set({ vault, unlocked: !!vault }),
  setScreen: (screen) => set({ screen }),
}));
