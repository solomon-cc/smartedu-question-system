import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import Records from './Records.vue';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
const route = vi.hoisted(() => ({ path: '/history', query: {} as Record<string, string> }));
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  request: vi.fn(),
}));
let wrapper: VueWrapper;
const slot = { template: '<div><slot/></div>' };
const stubs = {
  PageHeader: { template: '<header><slot/></header>' },
  Feedback: true,
  EmptyState: true,
  VBtn: { template: '<button><slot/></button>' },
  VCard: slot,
  VChip: slot,
  VIcon: true,
  VSpacer: true,
  VDivider: true,
  VCardText: slot,
  VCardActions: slot,
  VDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot/></div>' },
  VPagination: {
    props: ['modelValue'],
    template: '<button @click="$emit(\'update:modelValue\',2)">下一页</button>',
  },
  VDataTableServer: true,
  VDataTable: true,
  VTab: true,
  VTabs: true,
  VList: true,
  VListItem: true,
  VExpansionPanels: true,
  VExpansionPanel: true,
  VExpansionPanelText: true,
};
afterEach(() => {
  wrapper?.unmount();
  auth.user = null;
  auth.permissions = [];
  route.query = {};
  vi.clearAllMocks();
});
it('student history cards retain server pagination and show stored choice text in details', async () => {
  auth.user = { id: 's', username: 's', name: '学生', role: 'STUDENT' };
  vi.mocked(request).mockImplementation(async (path) => ({
    list: [
      {
        id: path.endsWith('pageSize=10') ? 'r' : 'r2',
        name: '数字练习',
        type: 'practice',
        date: '2026-10-09',
        total: '1',
        correctCount: 1,
        questions: [
          {
            id: 'q',
            stem: '找出3',
            userAnswer: 'C',
            answer: 'C',
            status: 'correct',
            options: [{ value: 'C', text: '3' }],
          },
        ],
      },
    ],
    total: 11,
  }));
  wrapper = mount(Records, { global: { stubs } });
  await flushPromises();
  expect(wrapper.find('.student-record-card').exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'VDataTableServer' }).exists()).toBe(false);
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '下一页')!
    .trigger('click');
  await flushPromises();
  expect(request).toHaveBeenCalledWith('/history?page=2&pageSize=10');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '查看详情')!
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('你的答案：3 · 正确答案：3');
});
it('teacher history keeps its existing table interface', async () => {
  auth.user = { id: 't', username: 't', name: '老师', role: 'TEACHER' };
  vi.mocked(request).mockResolvedValue({ list: [], total: 0 });
  wrapper = mount(Records, { global: { stubs } });
  await flushPromises();
  expect(wrapper.find('.student-record-card').exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'VDataTableServer' }).exists()).toBe(true);
});
it('identifies the student, filters existing APIs, and uses teacher detail language', async () => {
  auth.user = { id: 't', username: 't', name: '老师', role: 'TEACHER' };
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
  route.query = { homeworkId: 'homework' };
  vi.mocked(request).mockImplementation(async (path) =>
    path === '/students'
      ? [{ id: 'child', name: '学生甲' }]
      : {
          list: [
            {
              id: 'record',
              studentId: 'child',
              name: '作业',
              questions: [
                {
                  id: 'q',
                  stem: '图片选择',
                  userAnswer: 'A',
                  answer: 'A',
                  options: [{ value: 'A', text: '小猫' }],
                },
              ],
            },
          ],
          total: 1,
        },
  );
  wrapper = mount(Records, {
    global: {
      stubs: {
        ...stubs,
        VSelect: {
          props: ['modelValue', 'label'],
          template: `<select :aria-label="label" @change="$emit('update:modelValue',$event.target.value)"><option value="">全部</option><option value="child">学生甲</option></select>`,
        },
        VDataTableServer: {
          props: ['items'],
          template: `<section><div v-for="item in items"><slot name="item.studentId" :item="item"/><slot name="item.actions" :item="item"/></div></section>`,
        },
      },
    },
  });
  await flushPromises();
  expect(request).toHaveBeenCalledWith('/history?page=1&pageSize=10&homeworkId=homework');
  expect(wrapper.text()).toContain('学生甲');
  await wrapper.get('[aria-label="筛选学生"]').setValue('child');
  await flushPromises();
  expect(request).toHaveBeenCalledWith(
    '/history?page=1&pageSize=10&studentId=child&homeworkId=homework',
  );
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '查看详情')!
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('学生作答：小猫');
  expect(wrapper.text()).not.toContain('你的答案');
});
