import { describe, expect, it } from 'vitest';
import { summarizePeak, type PeakItem } from './peak';
describe('PK summary', () => {
  it('separates unassessed from failed items and excludes unrelated scores', () => {
    const items = ['FLS-1', 'FLS-2', 'FLS-3'].map((code) => ({ code })) as PeakItem[];
    expect(
      summarizePeak(items, [
        { code: 'FLS-1', score: 0, response: '', notes: '' },
        { code: 'FLS-2', score: 1, response: '', notes: '' },
        { code: 'LLS-1', score: 1, response: '', notes: '' },
      ]),
    ).toEqual({ total: 3, recorded: 2, correct: 1 });
  });
});
