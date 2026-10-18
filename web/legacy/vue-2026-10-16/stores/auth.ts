import { reactive } from 'vue';
import { request, tokenStorage } from '../lib/api';
import type { Permission, User } from '../lib/types';
export const auth = reactive({
  user: null as User | null,
  permissions: [] as Permission[],
  ready: false,
});
export const can = (moduleId: string) =>
  auth.permissions.some((p) => p.moduleId === moduleId && p.uiAccess && p.apiAccess);
export async function restore() {
  try {
    if (tokenStorage.get()) {
      const [user, permissions] = await Promise.all([
        request<User>('/me'),
        request<Permission[]>('/me/permissions'),
      ]);
      auth.user = user;
      auth.permissions = permissions || [];
    }
  } catch {
    logout();
  } finally {
    auth.ready = true;
  }
}
export async function login(username: string, password: string) {
  const result = await request<{ user: User; token: string }>('/auth/login', 'POST', {
    username,
    password,
  });
  tokenStorage.set(result.token);
  try {
    const permissions = await request<Permission[]>('/me/permissions');
    auth.permissions = permissions || [];
    auth.user = result.user;
  } catch (error) {
    logout();
    throw error;
  }
}
export function logout() {
  tokenStorage.clear();
  auth.user = null;
  auth.permissions = [];
}
