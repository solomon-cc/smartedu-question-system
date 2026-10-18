import type { Option } from './types';

// Legacy questions use the answer content as value; newer questions use A/B/C.
// Format only the visible label. Keep value untouched for selection and grading.
export function optionLabel(option: Option): string {
  const value = String(option.value ?? '').trim();
  const text = option.text?.trim() || '';
  if (/^[A-Z]$/i.test(value) && text && text !== value) return `${value}. ${text}`;
  return text || (option.image && !/^[A-Z]$/i.test(value) ? '' : value);
}
