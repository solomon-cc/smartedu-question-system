import { afterEach, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import Assessment from './Assessment.vue';
import { request } from '../lib/api';
import { assessmentWorkspace } from '../lib/assessmentWorkspaces';
import { peakMethodFixture } from '../lib/assessmentFixtures';
const state = vi.hoisted(() => ({ route: null as any, push: vi.fn() }));
vi.mock('vue-router', () => ({
  useRoute: () => state.route,
  useRouter: () => ({ push: state.push }),
}));
vi.mock('../lib/api', () => ({ request: vi.fn() }));
vi.mock('../lib/assessmentWorkspaces', () => ({
  assessmentWorkspace: vi.fn(() => ({
    props: ['method'],
    template: '<p>{{ method.name }}工作区</p>',
  })),
}));
const other = { ...peakMethodFixture, id: 'test-only', name: '测试方法', renderer: 'numeric' };
const create = async (methodId = 'peak') => {
  state.route = reactive({ query: { studentId: 'student', methodId, assessmentId: 'same-id' } });
  vi.mocked(request).mockResolvedValue([peakMethodFixture, other]);
  const w = mount(Assessment, {
    global: {
      stubs: {
        PageHeader: true,
        Feedback: { props: ['error'], template: '<p>{{error}}</p>' },
        VSelect: {
          name: 'MethodSelect',
          props: ['modelValue', 'items'],
          emits: ['update:modelValue'],
          template: '<select />',
        },
      },
    },
  });
  await flushPromises();
  return w;
};
afterEach(() => vi.clearAllMocks());
it('dispatches registered methods and removes the old method record ID when switching', async () => {
  const w = await create();
  expect(w.text()).toContain('PEAK 预评估工作区');
  w.getComponent({ name: 'MethodSelect' }).vm.$emit('update:modelValue', 'test-only');
  await flushPromises();
  expect(state.push).toHaveBeenCalledWith({
    path: '/assessment',
    query: { studentId: 'student', methodId: 'test-only' },
  });
  state.route.query.methodId = 'test-only';
  await flushPromises();
  expect(assessmentWorkspace).toHaveBeenLastCalledWith('numeric');
  expect(w.text()).toContain('测试方法工作区');
  w.unmount();
});
it('rejects an unknown method instead of interpreting its record as PEAK', async () => {
  const w = await create('unknown');
  expect(w.text()).toContain('该评估方法尚未接入');
  expect(assessmentWorkspace).not.toHaveBeenCalled();
  w.unmount();
});
it('does not write a record on opening a method', async () => {
  const w = await create('test-only');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith('/assessments/methods');
  w.unmount();
});
