import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request, tokenStorage, query } from './api';
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.unstubAllGlobals();
});
describe('API contract', () => {
  it('uses the same-origin API and attaches the current session token', async () => {
    tokenStorage.set('test-token');
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: { id: '1' } })));
    vi.stubGlobal('fetch', fetch);
    expect(await request('/me')).toEqual({ id: '1' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });
  it('rejects logical failures even for HTTP 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 1, err: '保存失败' }))),
    );
    await expect(request('/questions', 'DELETE')).rejects.toThrow('保存失败');
  });
  it('clears stale authentication and notifies the app on 401', async () => {
    tokenStorage.set('expired');
    localStorage.setItem('user', 'legacy');
    const listener = vi.fn();
    window.addEventListener('auth:expired', listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(request('/me')).rejects.toThrow('登录已过期');
    expect(tokenStorage.get()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('auth:expired', listener);
  });
  it('reports unreachable backends without fake data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(request('/questions')).rejects.toThrow('暂时无法连接服务');
  });
  it('handles invalid response bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })),
    );
    await expect(request('/me')).rejects.toThrow('服务返回异常');
  });
  it('encodes filters and omits null filters', () => {
    expect(query({ search: 'a & b', grade: null, page: 1 })).toBe('search=a+%26+b&page=1');
  });
});
