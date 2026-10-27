import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MyLearning from './MyLearning.vue';
import { api } from '../lib/api';
import { auth, type Role } from '../lib/auth';
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  api: vi.fn(),
}));
vi.mock('../lib/progress', () => ({ pendingProgress: () => ({}), flushProgress: vi.fn() }));
const stubs = {
  RouterLink: { template: '<a><slot/></a>' },
  PageState: { props: ['error', 'loading'], template: '<div>{{error}}</div>' },
  'a-alert': true,
  'a-tag': true,
};
function render(role: Role) {
  auth.user = { id: 'u', username: 'u', name: 'User', role };
  return mount(MyLearning, { global: { stubs } });
}
afterEach(() => {
  vi.clearAllMocks();
  auth.user = null;
});
it('keeps courses available when practice history fails', async () => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === '/portal/attempts') throw new Error('练习记录暂时不可用');
    return { courses: [{ id: 'c', title: '可继续学习的课程', audience: 'teacher' }] };
  });
  const wrapper = render('STUDENT');
  await flushPromises();
  expect(wrapper.text()).toContain('可继续学习的课程');
  expect(wrapper.text()).toContain('练习记录暂时不可用');
  wrapper.unmount();
});
it('keeps practice history available when courses fail', async () => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === '/portal/progress') throw new Error('课程暂时不可用');
    return [
      { id: 'a', questionTitle: '数量练习', correct: true, createdAt: '2026-10-20T00:00:00Z' },
    ];
  });
  const wrapper = render('STUDENT');
  await flushPromises();
  expect(wrapper.text()).toContain('数量练习');
  expect(wrapper.text()).toContain('课程暂时不可用');
  wrapper.unmount();
});
it.each(['ADMIN', 'TEACHER', 'PARENT', 'TRAINER'] as Role[])(
  'does not fetch unused personal practice history for %s',
  async (role) => {
    vi.mocked(api).mockResolvedValue({ courses: [] });
    const wrapper = render(role);
    await flushPromises();
    expect(api).toHaveBeenCalledExactlyOnceWith('/portal/progress');
    wrapper.unmount();
  },
);

it('labels new, ongoing and completed courses from actual lesson progress', async () => {
  vi.mocked(api).mockResolvedValue({
    courses: [
      { id: 'new', title: '新课程', lessons: [{ id: 'n' }] },
      { id: 'ongoing', title: '进行中课程', lessons: [{ id: 'o' }] },
      { id: 'done', title: '已完成课程', lessons: [{ id: 'd' }] },
    ],
    progress: [
      { lessonId: 'o', position: 30, completed: false },
      { lessonId: 'd', position: 0, completed: true },
    ],
  });
  const wrapper = render('TEACHER');
  await flushPromises();
  expect(wrapper.findAll('.my-course-list .button').map((b) => b.text())).toEqual([
    '开始学习',
    '继续学习',
    '查看课程',
  ]);
  wrapper.unmount();
});
