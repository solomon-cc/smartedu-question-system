import { describe, it, expect } from 'vitest';
import { gradeCardsFor } from './catalog';
import type { Topic } from './types';
const topics: Topic[] = [
  {
    id: 'reading',
    grade: 2,
    subject: 'READING',
    name: '阅读理解',
    objectives: [{ id: 'r', name: '理解段落', count: 3 }],
  },
  {
    id: 'math',
    grade: 1,
    subject: '数学',
    name: '数与数量',
    objectives: [
      { id: 'm1', name: '认识数量', count: 2 },
      { id: 'm2', name: '比较多少', count: 4 },
      { id: 'empty', name: '整理中', count: 0 },
    ],
  },
  {
    id: 'empty-topic',
    grade: 3,
    subject: 'MATH',
    name: '未发布',
    objectives: [{ id: 'no-question', name: '未发布', count: 0 }],
  },
];
describe('grade-first IXL catalogue', () => {
  it('groups real skill and question counts by grade and recognizes subject aliases', () => {
    const cards = gradeCardsFor(topics);
    expect(cards.map((c) => c.grade)).toEqual([1, 2]);
    expect(cards[0]?.subjects[0]).toMatchObject({ label: '数学', skills: 2, questions: 6 });
    expect(cards[1]?.subjects[0]).toMatchObject({ label: '阅读', skills: 1, questions: 3 });
  });
  it('filters against actual skill names instead of inventing summary counts', () => {
    const cards = gradeCardsFor(topics, '比较');
    expect(cards).toHaveLength(1);
    expect(cards[0]?.subjects[0]).toMatchObject({ skills: 1, questions: 4 });
  });
  it('supports Chinese grade search and shows an honest empty result', () => {
    expect(gradeCardsFor(topics, '二年级').map((c) => c.grade)).toEqual([2]);
    expect(gradeCardsFor(topics, 'no such skill')).toEqual([]);
  });
});
