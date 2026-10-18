export interface Objective {
  id: string;
  name: string;
  count: number;
}
export interface Topic {
  id: string;
  name: string;
  subject: string;
  grade: number;
  objectives: Objective[];
}
export interface Lesson {
  id: string;
  title: string;
  kind: 'text' | 'video' | 'document';
  text: string;
  uploadId: string;
  duration: number;
}
export interface Course {
  id: string;
  title: string;
  summary: string;
  audience: 'parent' | 'teacher';
  instructor: string;
  ownerId: string;
  published: boolean;
  visibility: 'all' | 'assigned';
  userIds: string[];
  lessons: Lesson[];
  updatedAt?: string;
}
export interface Progress {
  lessonId: string;
  position: number;
  completed: boolean;
  updatedAt?: string;
}
export interface Question {
  id: string;
  subject: string;
  grade: number;
  type: string;
  stemText: string;
  stemImage?: string;
  options: { value: string; text: string; image?: string }[];
  answer: string;
  hint: string;
  objectiveId: string;
}
export interface Attempt {
  actorId?: string;
  questionTitle?: string;
  subject?: string;
  grade?: number;
  id: string;
  questionId: string;
  objectiveId: string;
  correct: boolean;
  createdAt: string;
}
export const subjects = [
  { value: 'MATH', label: '数学', symbol: '∑', description: '从数量认识，到数学思考' },
  { value: 'LANGUAGE', label: '语言词汇', symbol: 'Aa', description: '表达想法，建立沟通' },
  { value: 'READING', label: '阅读', symbol: '▤', description: '读懂文字，理解世界' },
  { value: 'LITERACY', label: '识字', symbol: '文', description: '从一个字，打开新世界' },
];
export const subjectName = (s: string) =>
  subjects.find((v) => v.value === s || v.label === s)?.label || s;
export const subjectValue = (s: string) =>
  subjects.find((v) => v.value === s || v.label === s)?.value || s;
export const kindName = (s: string) => ({ text: '图文', video: '视频', document: '文档' })[s] || s;
export const minute = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
