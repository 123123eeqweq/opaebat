import { useToastStore, toast } from '../toast.store';

describe('toast.store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('toast adds message', () => {
    useToastStore.getState().toast('Hello');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Hello');
    expect(useToastStore.getState().toasts[0].type).toBe('info');
  });

  it('toast with type', () => {
    useToastStore.getState().toast('Error!', 'error');
    expect(useToastStore.getState().toasts[0].type).toBe('error');
  });

  it('dismiss removes toast', () => {
    useToastStore.getState().toast('Hi');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('toast() helper works', () => {
    toast('From helper');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('From helper');
  });
});
