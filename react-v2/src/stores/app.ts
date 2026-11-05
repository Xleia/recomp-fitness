import { create } from 'zustand';
import type { RecompState } from '../types/state';

type AppStore = {
  vault: RecompState | null;
  vaultKey: CryptoKey | null;
  vaultSalt: Uint8Array | null;
  unlocked: boolean;
  screen: 'home' | 'workout' | 'plans' | 'nutrition' | 'progress' | 'settings';
  setVault: (vault: RecompState | null, key?: CryptoKey | null, salt?: Uint8Array | null) => void;
  setScreen: (screen: AppStore['screen']) => void;
};
export const useAppStore = create<AppStore>((set) => ({
  vault: null,
  vaultKey: null,
  vaultSalt: null,
  unlocked: false,
  screen: 'home',
  setVault: (vault, key = null, salt = null) => set({
    vault, vaultKey: key, vaultSalt: salt, unlocked: !!vault,
  }),
  setScreen: (screen) => set({ screen }),
}));
