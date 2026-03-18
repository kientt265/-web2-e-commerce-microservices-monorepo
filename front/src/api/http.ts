export async function readJsonSafe(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await res.json();
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { accessToken?: string | null },
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; data?: any }> {
  try {
    const headers: Record<string, string> = {
      ...(init?.headers as any),
    };
    if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (init?.accessToken) headers['Authorization'] = `Bearer ${init.accessToken}`;

    const res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || `Request failed (${res.status})`,
        data,
      };
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Network error' };
  }
}

