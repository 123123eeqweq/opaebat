import { useAccountStore } from '../account.store';

describe('account.store', () => {
  beforeEach(() => {
    useAccountStore.getState().clear();
  });

  it('starts with null snapshot', () => {
    expect(useAccountStore.getState().snapshot).toBeNull();
  });

  it('setSnapshot updates state', () => {
    const snapshot = {
      accountId: 'acc-1',
      type: 'DEMO' as const,
      balance: 1000,
      currency: 'USD',
    };
    useAccountStore.getState().setSnapshot(snapshot);
    expect(useAccountStore.getState().snapshot).toEqual(snapshot);
  });

  it('clear resets snapshot', () => {
    useAccountStore.getState().setSnapshot({
      accountId: 'x',
      type: 'DEMO',
      balance: 0,
      currency: 'USD',
    });
    useAccountStore.getState().clear();
    expect(useAccountStore.getState().snapshot).toBeNull();
  });
});
