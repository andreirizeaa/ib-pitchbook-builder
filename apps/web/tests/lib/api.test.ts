import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, API_URL } from '../../src/lib/api';

describe('apiClient()', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('makes GET request to correct URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    await apiClient('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/test-endpoint`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('sets Content-Type to application/json', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient('/endpoint');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');
  });

  it('includes Authorization Bearer header when token provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient('/endpoint', { token: 'my-token' });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer my-token' }),
    );
  });

  it('does NOT include Authorization when no token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient('/endpoint');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBeUndefined();
  });

  it('throws Error with server error message on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Resource not found' }),
    });

    await expect(apiClient('/missing')).rejects.toThrow('Resource not found');
  });

  it('throws Error with statusText when JSON parsing fails on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('invalid json')),
    });

    await expect(apiClient('/broken')).rejects.toThrow('Internal Server Error');
  });

  it('passes method and body through to fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    });

    await apiClient('/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/items`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    );
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 42, name: 'result' }),
    });

    const result = await apiClient<{ id: number; name: string }>('/data');
    expect(result).toEqual({ id: 42, name: 'result' });
  });
});
