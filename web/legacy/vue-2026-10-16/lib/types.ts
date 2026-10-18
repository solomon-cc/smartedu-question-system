export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  status?: string;
}
export interface Permission {
  role: Role;
  moduleId: string;
  parentId: string;
  uiAccess: boolean;
  apiAccess: boolean;
  sortOrder: number;
  workspaceSections?: string[];
}
export interface Option {
  value: string;
  text?: string;
  image?: string;
}
export interface Question {
  id: string;
  subject: string;
  grade: number;
  type: string;
  stemText: string;
  stemImage?: string;
  answer: string;
  options?: Option[];
  hint?: string;
  objectiveId?: string;
  attempts?: number;
  correctRate?: number;
}
export interface Page<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Point {
  label: string;
  value: number;
}
export const subjects = [
  { title: '数学', value: 'MATH' },
  { title: '语言词汇', value: 'LANGUAGE' },
  { title: '阅读', value: 'READING' },
  { title: '识字', value: 'LITERACY' },
];
export const questionTypes = [
  { title: '单选题', value: 'MULTIPLE_CHOICE' },
  { title: '多选题', value: 'MULTIPLE_SELECT' },
  { title: '判断题', value: 'TRUE_FALSE' },
  { title: '填空题', value: 'FILL_BLANK' },
  { title: '计算题', value: 'CALCULATION' },
];
export const roles = [
  { title: '管理员', value: 'ADMIN' },
  { title: '教师', value: 'TEACHER' },
  { title: '学生', value: 'STUDENT' },
];
export const subjectLabel = (value: string) =>
  subjects.find((x) => x.value === value)?.title || value;
export const typeLabel = (value: string) =>
  questionTypes.find((x) => x.value === value)?.title || value;
export const roleLabel = (value?: string) => roles.find((x) => x.value === value)?.title || value;
export const required = (value: unknown) =>
  (Array.isArray(value)
    ? value.length > 0
    : value !== null && value !== undefined && String(value).trim() !== '') || '请填写此项';
export const localDate = () => new Date().toLocaleDateString('sv-SE');
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : '操作失败，请重试';
// Flexible records reflect the existing backend's heterogeneous analytics responses.
export type RecordData = Record<string, any>;
