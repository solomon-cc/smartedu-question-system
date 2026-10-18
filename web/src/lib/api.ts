const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export const token = {
  get: () => sessionStorage.getItem('smartedu.token'),
  set: (v: string) => sessionStorage.setItem('smartedu.token', v),
  clear: () => sessionStorage.removeItem('smartedu.token'),
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token.get() ? { Authorization: `Bearer ${token.get()}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error('连接失败，请检查网络后重试');
  }
  if (response.status === 401) {
    token.clear();
    window.dispatchEvent(new Event('auth:expired'));
    throw new Error('登录已过期，请重新登录');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.code !== 0)
    throw new ApiError(response.status, data?.err || data?.error || '暂时无法完成操作，请重试');
  return data.data;
}
export const query = (v: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(v)
      .filter(([, v]) => v !== '' && v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
export const message = (e: unknown) => (e instanceof Error ? e.message : '操作失败，请重试');
export { base };
