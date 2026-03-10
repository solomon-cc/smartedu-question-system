import { QuestionType } from './types';

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const GRADE_MAP: Record<string, number> = {
  '一年级': 1, '二年级': 2, '三年级': 3, '四年级': 4, '五年级': 5, '六年级': 6
};

export const REVERSE_GRADE_MAP: Record<number, string> = {
  1: '一年级', 2: '二年级', 3: '三年级', 4: '四年级', 5: '五年级', 6: '六年级'
};

export const TYPE_MAP: Record<string, QuestionType> = {
  '单选题': QuestionType.MULTIPLE_CHOICE,
  '多选题': QuestionType.MULTIPLE_SELECT,
  '填空题': QuestionType.FILL_BLANK,
  '判断题': QuestionType.TRUE_FALSE,
  '计算题': QuestionType.CALCULATION
};

export const REVERSE_TYPE_MAP: Record<string, string> = {
  [QuestionType.MULTIPLE_CHOICE]: '单选题',
  [QuestionType.MULTIPLE_SELECT]: '多选题',
  [QuestionType.TRUE_FALSE]: '判断题',
  [QuestionType.FILL_BLANK]: '填空题',
  [QuestionType.CALCULATION]: '计算题'
};

export const SUBJECTS = [
  { id: 'MATH', name: '数学', enName: 'Math', color: 'bg-blue-500', icon: '➗' },
  { id: 'LANGUAGE', name: '语言词汇', enName: 'Language', color: 'bg-green-500', icon: '🔤' },
  { id: 'READING', name: '阅读', enName: 'Reading', color: 'bg-purple-500', icon: '📖' },
  { id: 'LITERACY', name: '识字', enName: 'Literacy', color: 'bg-orange-500', icon: '🏮' }
];

export const GRADES = [
  { id: 1, name: '一年级', enName: 'Grade 1' },
  { id: 2, name: '二年级', enName: 'Grade 2' },
  { id: 3, name: '三年级', enName: 'Grade 3' },
  { id: 4, name: '四年级', enName: 'Grade 4' },
  { id: 5, name: '五年级', enName: 'Grade 5' },
  { id: 6, name: '六年级', enName: 'Grade 6' }
];

export const isTokenExpired = (token: string): boolean => {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    const exp = payload.exp;
    return (Date.now() / 1000) > exp;
  } catch (e) {
    return true;
  }
};