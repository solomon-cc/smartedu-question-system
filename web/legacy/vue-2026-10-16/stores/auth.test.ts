import { beforeEach, describe, it, expect, vi } from 'vitest';
import { auth, can, login, logout, restore } from './auth';
import { tokenStorage } from '../lib/api';
beforeEach(() => {
  logout();
  auth.ready = false;
  vi.unstubAllGlobals();
});
describe('authorization', () => {
  it('denies missing permissions and requires both UI and API access', () => {
    expect(can('questions')).toBe(false);
    auth.permissions = [
      {
        moduleId: 'questions',
        role: 'TEACHER',
        parentId: '',
        sortOrder: 1,
        uiAccess: true,
        apiAccess: false,
      },
    ];
    expect(can('questions')).toBe(false);
    auth.permissions[0].apiAccess = true;
    expect(can('questions')).toBe(true);
  });
  it('rolls back login if permission loading fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ code: 0, data: { user: { id: 'a', role: 'ADMIN' }, token: 'valid' } }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ code: 1, err: 'permission failure' })),
        ),
    );
    await expect(login('a', 'password')).rejects.toThrow();
    expect(auth.user).toBeNull();
    expect(tokenStorage.get()).toBeNull();
  });
  it('restores identity from /me, never from a cached user object', async () => {
    tokenStorage.set('token');
    localStorage.setItem('user', JSON.stringify({ id: 'forged', role: 'ADMIN' }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: 0,
              data: url.endsWith('/me') ? { id: 'real', role: 'STUDENT' } : [],
            }),
          ),
        ),
      ),
    );
    await restore();
    expect(auth.user?.id).toBe('real');
    expect(auth.user?.role).toBe('STUDENT');
    expect(auth.ready).toBe(true);
  });
});
