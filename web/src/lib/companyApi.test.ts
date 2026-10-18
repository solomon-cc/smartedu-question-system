import { it, expect, vi, afterEach } from 'vitest';
import { companyGet } from './companyApi';
afterEach(() => vi.unstubAllGlobals());
it('loads public catalogue data without authentication or cookies', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ code: 0, data: [{ id: 'public-course' }] }),
  });
  vi.stubGlobal('fetch', fetch);
  expect(await companyGet('courses')).toEqual([{ id: 'public-course' }]);
  expect(fetch.mock.calls[0][0]).toBe('/api/portal/courses');
  expect(fetch.mock.calls[0][1].credentials).toBe('omit');
  expect(fetch.mock.calls[0][1].headers).toBeUndefined();
});
it('reports network and API errors instead of replacing them with empty course lists', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await expect(companyGet('courses')).rejects.toThrow('连接失败');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, json: async () => ({ err: '课程加载失败' }) }),
  );
  await expect(companyGet('courses')).rejects.toThrow('课程加载失败');
});
