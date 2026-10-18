import { describe, expect, it } from 'vitest';
import { comparisonLabel } from './learningPlan';
const score = (value: number) => ({ code: 'item', score: value, response: '', notes: '' });
describe('assessment comparison', () => {
  it('keeps unassessed distinct and displays interpretation supplied by the method', () => {
    expect(comparisonLabel(score(0), null)).toBe('未评 · 暂不比较');
    expect(comparisonLabel(null, score(3))).toBe('未评 · 暂不比较');
    expect(comparisonLabel(score(0.5), score(2))).toBe('已记录两次反应');
    expect(comparisonLabel(score(0), score(1), '本次出现正确反应')).toBe('本次出现正确反应');
    expect(comparisonLabel(score(1), score(3), '方法专属解释')).toBe('方法专属解释');
  });
});
