import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import GenericAssessment from './GenericAssessment.vue';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
import type { AssessmentMethodInfo } from '../lib/assessments';
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { assessmentId: 'record', studentId: 'student' } }),
}));
vi.mock('../lib/api', () => ({ request: vi.fn() }));
const method: AssessmentMethodInfo = {
  id: 'test-only',
  name: '测试观察法',
  currentVersion: 'v2',
  versions: ['v1', 'v2'],
  renderer: 'numeric',
  canCompare: true,
  canLinkTargets: true,
};
const record = {
  id: 'record',
  methodId: method.id,
  studentId: 'student',
  module: 'OBS',
  version: 'v1',
  date: '2026-10-09',
  status: 'ongoing',
};
const definition = {
  methodId: method.id,
  version: 'v1',
  modules: [{ id: 'OBS', name: '观察' }],
  items: [
    {
      code: 'one',
      module: 'OBS',
      title: '图片观察',
      script: '教师参考答案',
      materials: ['/test.png'],
    },
  ],
  scoring: { label: '观察值', options: [], min: 0, max: 3, step: 0.5 },
  instructions: '按观察法复核',
};
const slot = { template: '<div><slot/></div>' };
let w: VueWrapper;
async function setup(renderer = 'numeric', role = 'TEACHER') {
  auth.user = { id: 'teacher', username: 'teacher', name: '老师', role: role as any };
  auth.permissions = [];
  vi.mocked(request).mockImplementation(async (path, verb, body) => {
    if (path.includes('/catalog')) return definition;
    if (path.endsWith('/responses'))
      return verb === 'POST'
        ? body
        : [{ code: 'one', score: 0.5, response: '观察反应', notes: '' }];
    if (path.endsWith('/complete')) throw new Error('本方法尚未达到完成条件');
    return [record];
  });
  w = mount(GenericAssessment, {
    props: { method: { ...method, renderer } },
    global: {
      stubs: {
        PageHeader: slot,
        Feedback: { props: ['error'], template: '<p>{{error}}</p>' },
        EmptyState: true,
        EditorDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot :close="()=>{}"/></div>',
        },
        VDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue" data-finish><slot/></div>',
        },
        VBtn: {
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot/></button>',
        },
        VForm: {
          template:
            '<form @submit.prevent="$emit(\'submit\',Object.assign($event,{valid:true}))"><slot/></form>',
        },
        VTextField: {
          name: 'ScoreInput',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input />',
        },
        VTextarea: true,
        VSelect: true,
        VAutocomplete: true,
        VCard: slot,
        VCardText: slot,
        VCardActions: slot,
        VSpacer: true,
        VAlert: slot,
        VSnackbar: slot,
      },
    },
  });
  await flushPromises();
}
async function click(label: string) {
  await w
    .findAll('button')
    .find((b) => b.text() === label)!
    .trigger('click');
  await flushPromises();
}
afterEach(() => {
  w?.unmount();
  auth.user = null;
  vi.clearAllMocks();
});
it('loads the pinned version and records fractional scores without PEAK assumptions', async () => {
  await setup();
  expect(request).toHaveBeenCalledWith('/assessments/methods/test-only/catalog?version=v1');
  expect(w.text()).toContain('0.5');
  expect(w.text()).not.toContain('未通过');
  await click('记录反应');
  expect(w.get('img').attributes('src')).toBe('/test.png');
  expect(w.text()).toContain('教师参考答案');
  await click('展示给学生');
  expect(w.text()).not.toContain('教师参考答案');
  expect(w.find('input').exists()).toBe(false);
  expect(w.find('img').exists()).toBe(true);
  await click('返回老师记录');
  w.getComponent({ name: 'ScoreInput' }).vm.$emit('update:modelValue', '2.5');
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(request).toHaveBeenCalledWith(
    '/assessments/methods/test-only/records/record/responses',
    'POST',
    expect.objectContaining({ score: 2.5 }),
  );
});
it('keeps the provider completion error visible in the confirmation dialog', async () => {
  await setup();
  await click('复核并完成');
  await click('确认完成');
  expect(w.get('[data-finish]').text()).toContain('本方法尚未达到完成条件');
});
it('keeps an unregistered renderer read-only', async () => {
  await setup('special-not-bundled');
  expect(w.text()).toContain('需要专用施测界面');
  expect(w.text()).not.toContain('复核并完成');
  expect(
    w
      .findAll('button')
      .find((b) => b.text() === '记录反应')!
      .attributes('disabled'),
  ).toBeDefined();
  expect(request).not.toHaveBeenCalledWith(expect.anything(), 'POST', expect.anything());
});
it('student viewing has no creation, scoring, completion or teacher prompts', async () => {
  await setup('numeric', 'STUDENT');
  expect(w.text()).not.toContain('记录反应');
  expect(w.text()).not.toContain('复核并完成');
  expect(w.text()).not.toContain('教师参考答案');
  expect(w.text()).not.toContain('新建');
});
