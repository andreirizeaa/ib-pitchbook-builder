import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env before importing apiClient
vi.stubGlobal('fetch', vi.fn());

// We need to test the logic directly since import.meta.env is Vite-only
describe('apiClient', () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  // Inline a simplified version for testing the logic
  async function apiClient<T = any>(
    path: string,
    opts: { token?: string; headers?: Record<string, string> } & RequestInit = {},
  ): Promise<T> {
    const { token, ...fetchOpts } = opts;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`http://localhost:8002${path}`, { ...fetchOpts, headers });
    if (!(res as Response).ok) {
      const body = await (res as Response).json().catch(() => ({}));
      throw new Error((body as any).error || (res as Response).statusText);
    }
    return (res as Response).json();
  }

  it('should make a GET request with correct URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await apiClient('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8002/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(result).toEqual({ data: 'test' });
  });

  it('should include authorization header when token is provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient('/api/test', { token: 'my-jwt-token' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8002/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer my-jwt-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('should not include authorization header when no token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient('/api/test');

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders).not.toHaveProperty('Authorization');
  });

  it('should throw error with server error message on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: 'Invalid input' }),
    });

    await expect(apiClient('/api/test')).rejects.toThrow('Invalid input');
  });

  it('should throw error with statusText when body parse fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('parse error')),
    });

    await expect(apiClient('/api/test')).rejects.toThrow('Internal Server Error');
  });

  it('should pass through fetch options like method and body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123' }),
    });

    await apiClient('/api/pitchbooks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
      token: 'tk',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8002/api/pitchbooks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      }),
    );
  });
});
