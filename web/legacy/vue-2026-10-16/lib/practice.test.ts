import { describe, it, expect } from 'vitest';
import { answersEqual } from './practice';
describe('answer comparison', () => {
  it('accepts multi-select answers independent of order and spaces', () => {
    expect(answersEqual('C, A', 'A,C', 'MULTIPLE_SELECT')).toBe(true);
    expect(answersEqual('C，A', 'A,C', 'MULTIPLE_SELECT')).toBe(true);
  });
  it('does not accept missing or extra selections', () => {
    expect(answersEqual('A', 'A,C', 'MULTIPLE_SELECT')).toBe(false);
    expect(answersEqual('A,B,C', 'A,C', 'MULTIPLE_SELECT')).toBe(false);
  });
  it('supports legacy Chinese true/false answers', () => {
    expect(answersEqual('true', '正确', 'TRUE_FALSE')).toBe(true);
    expect(answersEqual('false', '×', 'TRUE_FALSE')).toBe(true);
    expect(answersEqual('false', '对', 'TRUE_FALSE')).toBe(false);
  });
  it('trims free text without changing its meaning', () => {
    expect(answersEqual(' 12 ', '12', 'CALCULATION')).toBe(true);
    expect(answersEqual('12', '21', 'CALCULATION')).toBe(false);
  });
});
