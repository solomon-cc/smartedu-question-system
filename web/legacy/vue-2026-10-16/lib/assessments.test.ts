import { expect, it, vi } from 'vitest';
import { assessmentClient, assessmentKey, responseLabel } from './assessments';
import { request } from './api';
vi.mock('./api', () => ({ request: vi.fn() }));
it('scopes matching record IDs by method and forwards the pinned version', () => {
  expect(assessmentKey({ methodId: 'peak', id: 'same' })).not.toBe(
    assessmentKey({ methodId: 'other', id: 'same' }),
  );
  assessmentClient('other').catalog('v1');
  expect(request).toHaveBeenLastCalledWith('/assessments/methods/other/catalog?version=v1');
  assessmentClient('other').responses('same');
  expect(request).toHaveBeenLastCalledWith('/assessments/methods/other/records/same/responses');
});
it('preserves zero, fractional values and unassessed as distinct states', () => {
  expect(responseLabel(null)).toBe('未评');
  expect(responseLabel({ code: 'x', score: 0, response: '', notes: '' })).toBe('0');
  expect(responseLabel({ code: 'x', score: 0.5, response: '', notes: '' })).toBe('0.5');
  expect(responseLabel({ code: 'x', score: null, response: '观察', notes: '' })).toBe('已记录观察');
});
