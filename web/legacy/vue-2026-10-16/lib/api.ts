const TOKEN_KEY = 'smartedu.token';
export const tokenStorage = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
  },
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export async function request<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    const token = tokenStorage.get();
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'zh-CN',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ApiError('暂时无法连接服务，请检查网络后重试', 0);
  }
  if (response.status === 401) {
    tokenStorage.clear();
    window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError('登录已过期，请重新登录', 401);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.code !== 0) {
    const msg = data?.err || data?.error;
    throw new ApiError(
      msg === 'Unauthorized'
        ? '账号或密码不正确'
        : msg || (response.status === 403 ? '你没有执行此操作的权限' : '服务返回异常，请稍后重试'),
      response.status,
    );
  }
  return data.data as T;
}
export const query = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) search.set(key, String(value));
  });
  return search.toString();
};
export async function allQuestions(params: Record<string, unknown> = {}) {
  const list: import('./types').Question[] = [];
  let page = 1,
    total = 0;
  do {
    const data = await request<import('./types').Page<import('./types').Question>>(
      `/questions?${query({ ...params, page, pageSize: 100 })}`,
    );
    list.push(...data.list);
    total = data.total;
    page++;
    if (!data.list.length) break;
  } while (list.length < total);
  return list;
}
