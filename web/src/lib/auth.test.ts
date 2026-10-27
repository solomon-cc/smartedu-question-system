import { beforeEach, expect, it, vi } from 'vitest';
import { auth, login, restore, canModule } from './auth';
import { api, token } from './api';
vi.mock('./api', async () => ({
  ...(await vi.importActual<typeof import('./api')>('./api')),
  api: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  token.clear();
  auth.user = null;
  auth.permissions = [];
  auth.ready = false;
});
it('loads module permissions together with the successful login and restores them after reload', async () => {
  const user = { id: 'child', username: 'child', name: 'Child', role: 'STUDENT' as const };
  const permissions = [
    { moduleId: 'application_games', uiAccess: true, apiAccess: true },
    { moduleId: 'mood_diary', uiAccess: false, apiAccess: true },
  ];
  vi.mocked(api)
    .mockResolvedValueOnce({ user, token: 'local-test-token' })
    .mockResolvedValueOnce(permissions);
  await login('child', 'test');
  expect(canModule('application_games')).toBe(true);
  expect(canModule('mood_diary')).toBe(false);
  auth.user = null;
  auth.permissions = [];
  auth.ready = false;
  vi.mocked(api).mockImplementation(async (path) => (path === '/me' ? user : permissions));
  await restore();
  expect(auth.user).toMatchObject({ id: 'child' });
  expect(canModule('application_games')).toBe(true);
});
it('clears the partial login if permissions could not be verified', async () => {
  vi.mocked(api)
    .mockResolvedValueOnce({ token: 'partial-token', user: { id: 'teacher', role: 'TEACHER' } })
    .mockRejectedValueOnce(new Error('权限读取失败'));
  await expect(login('teacher', 'test')).rejects.toThrow('权限读取失败');
  expect(token.get()).toBeNull();
  expect(auth.user).toBeNull();
  expect(auth.permissions).toEqual([]);
});
