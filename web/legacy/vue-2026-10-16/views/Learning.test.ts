import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import Learning from './Learning.vue';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
const route = vi.hoisted(() => ({ path: '/skills', query: {} }));
vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  request: vi.fn(),
}));
afterEach(() => {
  auth.user = null;
  auth.permissions = [];
  vi.clearAllMocks();
  route.path = '/skills';
});
it.each([0, 3])(
  'only offers a practice destination when the selected grade has questions (%i)',
  async (count) => {
    auth.user = { id: 'student', username: 'student', name: '学生', role: 'STUDENT' };
    vi.mocked(request).mockImplementation(async (path) =>
      path.startsWith('/questions/stats') ? [{ grade: 1, count }] : [],
    );
    const wrapper = mount(Learning, {
      global: {
        stubs: {
          PageHeader: true,
          Feedback: true,
          EmptyState: true,
          VIcon: true,
          VSelect: true,
          VCard: { template: '<section><slot /></section>' },
          VBtn: {
            props: ['disabled', 'to'],
            template: '<button :disabled="disabled" :data-to="to"><slot /></button>',
          },
        },
      },
    });
    await flushPromises();
    const start = wrapper.findAll('button').find((button) => button.text() === '开始练习')!;
    expect(start.element.disabled).toBe(count === 0);
    expect(start.attributes('data-to')).toBe(count ? '/practice?subject=MATH&grade=1' : undefined);
    expect(wrapper.text().includes('当前学科和年级暂无题目')).toBe(count === 0);
    wrapper.unmount();
  },
);
it('shows whose wrong answer needs support and narrows the teacher list by student', async () => {
  route.path = '/wrong-book';
  auth.user = { id: 'teacher', username: 'teacher', name: '老师', role: 'TEACHER' };
  auth.permissions = [
    {
      role: 'TEACHER',
      moduleId: 'students',
      parentId: '',
      sortOrder: 1,
      uiAccess: true,
      apiAccess: true,
    },
  ];
  vi.mocked(request).mockImplementation(async (path) =>
    path === '/students'
      ? [{ id: 's', name: '学生甲' }]
      : [
          {
            id: 'wrong',
            studentId: 's',
            questionId: 'q',
            question: { stemText: '找出3' },
            status: 1,
            errorCount: 2,
          },
        ],
  );
  const wrapper = mount(Learning, {
    global: {
      stubs: {
        PageHeader: true,
        Feedback: true,
        EmptyState: true,
        VAvatar: true,
        VIcon: true,
        VChip: { template: '<span><slot/></span>' },
        VCard: { template: '<section><slot/></section>' },
        VBtn: { props: ['to'], template: '<button :data-to="to"><slot/></button>' },
        VSelect: {
          props: ['label'],
          template: `<select :aria-label="label" @change="$emit('update:modelValue',$event.target.value)"><option value="">全部</option><option value="s">学生甲</option></select>`,
        },
      },
    },
  });
  await flushPromises();
  expect(wrapper.text()).toContain('学生甲');
  await wrapper.get('[aria-label="筛选学生"]').setValue('s');
  await flushPromises();
  expect(request).toHaveBeenCalledWith('/wrong-book?studentId=s');
  expect(wrapper.text()).toContain('预览题目');
  expect(wrapper.text()).not.toContain('再练一次');
  wrapper.unmount();
});
