import { reactive, computed } from 'vue';
import { api, token } from './api';
export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'TRAINER';
export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  status?: string;
}
export interface Permission {
  moduleId: string;
  uiAccess: boolean;
  apiAccess: boolean;
}
export const auth = reactive({
  user: null as User | null,
  permissions: [] as Permission[],
  ready: false,
});
export const canModule = (module: string) =>
  ['ADMIN', 'TEACHER', 'STUDENT'].includes(auth.user?.role || '') &&
  auth.permissions.some((p) => p.moduleId === module && p.uiAccess && p.apiAccess);
export const roleNames: Record<Role, string> = {
  ADMIN: '管理员',
  TEACHER: '老师',
  STUDENT: '学生',
  PARENT: '家长',
  TRAINER: '培训师',
};
export const manageQuestions = computed(() => ['ADMIN', 'TEACHER'].includes(auth.user?.role || ''));
export const manageCourses = computed(() => ['ADMIN', 'TRAINER'].includes(auth.user?.role || ''));
export const canPractice = computed(() =>
  ['ADMIN', 'TEACHER', 'STUDENT'].includes(auth.user?.role || ''),
);
export async function restore() {
  if (token.get()) {
    try {
      const [user, permissions] = await Promise.all([
        api<User>('/me'),
        api<Permission[]>('/me/permissions'),
      ]);
      auth.user = user;
      auth.permissions = permissions || [];
    } catch {
      token.clear();
      auth.user = null;
      auth.permissions = [];
    }
  }
  auth.ready = true;
}
export async function login(username: string, password: string) {
  const data = await api<{ token: string; user: User }>('/auth/login', 'POST', {
    username,
    password,
  });
  token.set(data.token);
  try {
    const permissions = await api<Permission[]>('/me/permissions');
    auth.user = data.user;
    auth.permissions = permissions || [];
    auth.ready = true;
  } catch (e) {
    logout();
    throw e;
  }
}
export function logout() {
  token.clear();
  auth.user = null;
  auth.permissions = [];
}

export const landingFor = (role?: Role) =>
  role === 'ADMIN' || role === 'TRAINER'
    ? '/manage/courses'
    : role === 'TEACHER'
      ? '/library'
      : '/learning';
