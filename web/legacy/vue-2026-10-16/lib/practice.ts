export function normalizeAnswer(answer: string, type: string) {
  const value = answer.trim();
  if (type === 'MULTIPLE_SELECT')
    return value
      .split(/[,，]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .sort()
      .join(',');
  if (type === 'TRUE_FALSE') {
    if (['true', '正确', '对', '是', '√'].includes(value.toLowerCase())) return 'true';
    if (['false', '错误', '错', '否', '×'].includes(value.toLowerCase())) return 'false';
  }
  return value;
}
export const answersEqual = (actual: string, expected: string, type: string) =>
  normalizeAnswer(actual, type) === normalizeAnswer(expected, type);
