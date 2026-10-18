import { describe, expect, it } from 'vitest';
import { optionLabel } from './options';
import { answersEqual } from './practice';

describe('option labels', () => {
  it('shows legacy answer values only once', () => {
    expect(optionLabel({ value: '5', text: '5' })).toBe('5');
    expect(optionLabel({ value: '10', text: '10' })).toBe('10');
    expect(optionLabel({ value: '苹果', text: '苹果' })).toBe('苹果');
  });
  it('retains letter identifiers for letter-based options', () => {
    expect(optionLabel({ value: 'A', text: '5' })).toBe('A. 5');
    expect(optionLabel({ value: 'B', text: '10' })).toBe('B. 10');
  });
  it('handles missing text and image-only options without leaking internal IDs', () => {
    expect(optionLabel({ value: '10' })).toBe('10');
    expect(optionLabel({ value: 'image-1', image: '/one.png' })).toBe('');
    expect(optionLabel({ value: 'A', image: '/one.png' })).toBe('A');
  });
  it('never changes the value used for grading', () => {
    const option = { value: '10', text: '10' };
    optionLabel(option);
    expect(option.value).toBe('10');
    expect(answersEqual(option.value, '10', 'MULTIPLE_CHOICE')).toBe(true);
  });
});
