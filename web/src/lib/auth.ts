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
export const auth = reactive({ user: null as User | null, ready: false });
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
      auth.user = await api<User>('/me');
    } catch {
      token.clear();
      auth.user = null;
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
  auth.user = data.user;
  auth.ready = true;
}
export function logout() {
  token.clear();
  auth.user = null;
}

export const landingFor = (role?: Role) =>
  role === 'ADMIN' || role === 'TRAINER'
    ? '/manage/courses'
    : role === 'TEACHER'
      ? '/library'
      : '/learning';
