/**
 * Shared hook for account switching (demo/real).
 * Replaces duplicated logic in terminal/page.tsx and AppHeader.tsx.
 */

import { useCallback } from 'react';
import { api } from '@/lib/api/api';
import { logger } from '@/lib/logger';
import { toast } from '@/stores/toast.store';
import type { AccountType } from '@/types/account';

export function useAccountSwitch() {
  const switchAccount = useCallback(async (type: AccountType): Promise<boolean> => {
    try {
      const r = await api<{ accounts: Array<{ id: string; type: string }> }>('/api/accounts');
      const a = r.accounts.find((x) => x.type === type);
      if (!a) return false;
      await api('/api/accounts/switch', {
        method: 'POST',
        body: JSON.stringify({ accountId: a.id }),
      });
      return true;
    } catch (e) {
      logger.error(e);
      toast('Не удалось переключить аккаунт', 'error');
      return false;
    }
  }, []);

  return { switchAccount };
}
