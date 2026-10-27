import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Mood from './Mood.vue';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  api: vi.fn(),
}));
vi.mock('../components/useLeaveGuard', () => ({
  useLeaveGuard: () => ({ confirm: async () => true }),
}));
const diary = {
  id: 'd1',
  studentId: 'child',
  date: '2026-10-18',
  source: 'student',
  mood: 4,
  intensity: 5,
  event: '完成拼图',
  feeling: '开心',
  thought: '',
  physicalSensation: '',
};
const stubs = {
  'a-modal': { props: ['visible'], template: '<section v-if="visible"><slot/></section>' },
  'a-button': {
    props: ['disabled', 'loading', 'htmlType'],
    template:
      '<button :type="htmlType || \'button\'" :disabled="disabled || loading"><slot/></button>',
  },
  'a-alert': { template: '<div><slot/></div>' },
  'a-pagination': true,
  PageState: true,
};
afterEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  auth.permissions = [];
});
it('student saves personal mood without exposing student selectors or teacher follow-up', async () => {
  auth.user = { id: 'child', name: 'child', username: 'child', role: 'STUDENT' };
  vi.mocked(api).mockImplementation(async (path, method) =>
    method === 'POST' ? diary : { list: [diary], total: 1 },
  );
  const wrapper = mount(Mood, { global: { stubs } });
  await flushPromises();
  expect(wrapper.find('[aria-label="筛选情绪学生"]').exists()).toBe(false);
  await wrapper.findAll('.mood-quick button')[3]!.trigger('click');
  await wrapper.get('[aria-label="发生了什么"]').setValue('完成拼图');
  await wrapper.get('.mood-form').trigger('submit');
  await flushPromises();
  expect(api).toHaveBeenCalledWith(
    '/mood-diaries',
    'POST',
    expect.objectContaining({ mood: 4, event: '完成拼图', studentId: '' }),
  );
  expect(vi.mocked(api).mock.calls.some(([path]) => path.includes('/observations'))).toBe(false);
  wrapper.unmount();
});
it('teacher follow-up stays separate from the student self-report and history filters persist', async () => {
  auth.user = { id: 'teacher', name: 'teacher', username: 'teacher', role: 'TEACHER' };
  auth.permissions = [{ moduleId: 'mood_diary', uiAccess: true, apiAccess: true }];
  vi.mocked(api).mockImplementation(async (path, method, body) => {
    if (path === '/mood-diaries/students') return [{ id: 'child', name: '学生甲' }];
    if (path.includes('/observations'))
      return method === 'POST'
        ? { id: 'o1', notes: (body as { notes: string }).notes, createdAt: '2026-10-18' }
        : [];
    return { list: [diary], total: 1 };
  });
  const wrapper = mount(Mood, { global: { stubs } });
  await flushPromises();
  await wrapper.get('[aria-label="记录来源"]').setValue('student');
  await flushPromises();
  expect(vi.mocked(api).mock.calls.some(([path]) => path.includes('source=student'))).toBe(true);
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '查看与跟进')!
    .trigger('click');
  await flushPromises();
  await wrapper.get('[aria-label="本次跟进备注"]').setValue('下次提供安静的休息时间');
  await wrapper.get('.mood-follow form').trigger('submit');
  await flushPromises();
  expect(api).toHaveBeenCalledWith('/mood-diaries/d1/observations', 'POST', {
    notes: '下次提供安静的休息时间',
  });
  expect(
    vi
      .mocked(api)
      .mock.calls.some(([path, method]) => path === '/mood-diaries' && method === 'POST'),
  ).toBe(false);
  wrapper.unmount();
});
