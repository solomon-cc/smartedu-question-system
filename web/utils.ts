import { QuestionType } from './types';

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const generateMockId = () => Math.random().toString(36).substr(2, 9);

export const GRADE_MAP: Record<string, number> = {
  '一年级': 1, '二年级': 2, '三年级': 3, '四年级': 4, '五年级': 5, '六年级': 6
};

export const REVERSE_GRADE_MAP: Record<number, string> = {
  1: '一年级', 2: '二年级', 3: '三年级', 4: '四年级', 5: '五年级', 6: '六年级'
};

export const TYPE_MAP: Record<string, QuestionType> = {
  '单选题': QuestionType.MULTIPLE_CHOICE,
  '多选题': QuestionType.MULTIPLE_CHOICE, // Backend might distinguish, but sharing type for now or using array answer
  '填空题': QuestionType.FILL_BLANK,
  '判断题': QuestionType.TRUE_FALSE,
  '计算题': QuestionType.CALCULATION
};

export const REVERSE_TYPE_MAP: Record<string, string> = {
  [QuestionType.MULTIPLE_CHOICE]: '单选题', // Simplified
  [QuestionType.TRUE_FALSE]: '判断题',
  [QuestionType.FILL_BLANK]: '填空题',
  [QuestionType.CALCULATION]: '计算题'
};

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