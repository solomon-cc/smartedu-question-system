import { afterEach, expect, it, vi } from 'vitest';
import { assessmentAsset } from './assessmentAssets';
import { token } from './api';
afterEach(() => {
  vi.unstubAllGlobals();
  token.clear();
});
it('uses the authorization header rather than putting a token into the asset URL', async () => {
  token.set('local-test');
  const fetcher = vi.fn().mockResolvedValue(new Response('image', { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  await assessmentAsset('D-1.png');
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/portal/assessment-assets/D-1.png');
  expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: 'Bearer local-test' });
});
it('expires the session when access to an assessment material returns 401', async () => {
  token.set('expired');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
  const listener = vi.fn();
  window.addEventListener('auth:expired', listener);
  await expect(assessmentAsset('D.pdf')).rejects.toThrow('登录已过期');
  expect(token.get()).toBeNull();
  expect(listener).toHaveBeenCalledOnce();
  window.removeEventListener('auth:expired', listener);
});
