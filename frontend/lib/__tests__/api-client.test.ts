import { ApiError, apiRequest } from '../api/client';

describe('ApiError', () => {
  it('extends Error', () => {
    const err = new ApiError(404, { message: 'Not found' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('has status and data', () => {
    const err = new ApiError(500, { error: 'Server error' }, 'Custom message');
    expect(err.status).toBe(500);
    expect(err.data).toEqual({ error: 'Server error' });
    expect(err.message).toBe('Custom message');
  });

  it('uses default message when not provided', () => {
    const err = new ApiError(401, {});
    expect(err.message).toContain('401');
  });
});

describe('apiRequest', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('throws ApiError on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Not found' }),
      headers: new Map([['content-type', 'application/json']]),
    });

    await expect(apiRequest('/test')).rejects.toThrow(ApiError);
    await expect(apiRequest('/test')).rejects.toMatchObject({
      status: 404,
      data: { error: 'Not found' },
    });
  });

  it('returns parsed JSON on success', async () => {
    const data = { user: { id: '1', email: 'a@b.com' } };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
      headers: new Map([['content-type', 'application/json']]),
    });

    const result = await apiRequest<typeof data>('/api/auth/me');
    expect(result).toEqual(data);
  });

  it('returns empty object for non-JSON response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'text/plain']]),
    });

    const result = await apiRequest<Record<string, never>>('/test');
    expect(result).toEqual({});
  });
});
