const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T = any>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = opts;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...fetchOpts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}
