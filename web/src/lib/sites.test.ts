import { it, expect } from 'vitest';
import { companyHashDestination, platformLogin } from './sites';
it('keeps public introductions and course catalogues on the company site', () => {
  for (const hash of ['#/library', '#/assessment', '#/training', '#/training?audience=parent'])
    expect(companyHashDestination(hash)).toBe(hash);
});
it('takes operations to the platform login while preserving the destination', () => {
  for (const hash of [
    '#/assessment/peak/record-1',
    '#/training/course-1',
    '#/practice?planId=target',
    '#/manage/users',
    '#/learning',
  ]) {
    const dest = companyHashDestination(hash);
    expect(dest.startsWith('https://go.ylmz.com.cn/#/login?')).toBe(true);
    const query = new URLSearchParams(dest.split('?')[1]);
    expect(query.get('from')).toBe('website');
    expect(query.get('redirect')).toBe(hash.slice(1));
  }
  const dest = companyHashDestination('#/login?redirect=/assessment');
  expect(new URLSearchParams(dest.split('?')[1]).get('redirect')).toBe('/assessment');
});
it('normalizes anchors and prevents external return URLs', () => {
  expect(companyHashDestination('#company-team')).toBe('#/#company-team');
  expect(companyHashDestination('#/#company-team')).toBe('#/#company-team');
  expect(new URLSearchParams(platformLogin('//evil.example').split('?')[1]).get('redirect')).toBe(
    '/learning',
  );
});
