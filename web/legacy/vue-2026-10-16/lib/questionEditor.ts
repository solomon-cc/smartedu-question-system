import type { Question, Option } from './types';
export function editableOptions(question?: Question): Option[] {
  const existing = question?.options || [];
  const values = [...new Set(['A', 'B', 'C', 'D', ...existing.map((o) => o.value)])];
  return values.map((value) => ({
    value,
    text: '',
    image: '',
    ...existing.find((o) => o.value === value),
  }));
}
