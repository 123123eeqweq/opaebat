/**
 * FLOW A-ACCOUNT: Zustand Store для аккаунта
 * 
 * ⚠️ ВАЖНО:
 * ❌ Никаких balance отдельно
 * ❌ Никаких useState
 * ✅ ТОЛЬКО snapshot целиком
 */

import { create } from 'zustand';
import { AccountSnapshot } from '@/types/account';

interface AccountState {
  snapshot: AccountSnapshot | null;

  setSnapshot: (snapshot: AccountSnapshot) => void;
  clear: () => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  snapshot: null,

  setSnapshot: (snapshot) =>
    set({ snapshot }),

  clear: () =>
    set({ snapshot: null }),
}));
