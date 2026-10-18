import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import StudentProfile from './StudentProfile.vue';
import { peakDefinitionFixture, peakMethodFixture } from '../lib/assessmentFixtures';
import { auth } from '../stores/auth';
import { allQuestions, request } from '../lib/api';
import type { LearningPlan } from '../lib/learningPlan';
const route = vi.hoisted(() => ({
  params: { id: 'student' },
  query: { assessmentId: 'baseline' },
}));
vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('../lib/api', () => ({ request: vi.fn(), allQuestions: vi.fn() }));
const slot = { template: '<div><slot /></div>' };
const field = defineComponent({
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template:
    '<label>{{label}}<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
});
const select = defineComponent({
  props: ['modelValue', 'items', 'label'],
  emits: ['update:modelValue'],
  template:
    '<label>{{label}}<select :aria-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value || item.id" :value="item.value || item.id">{{item.title}}</option></select></label>',
});
const checkbox = defineComponent({
  props: ['modelValue', 'value', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :value="value" :checked="modelValue.includes(value)" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked ? [...modelValue, value] : modelValue.filter(v => v !== value))" />',
});
const baseline = {
  methodId: 'peak',
  id: 'baseline',
  studentId: 'student',
  date: '2026-10-09',
  module: 'D',
  version: 'peak-pa-user-docs-v1',
  status: 'completed',
};
const newPlan: LearningPlan = {
  id: 'plan',
  studentId: 'student',
  assessmentId: 'baseline',
  module: 'D',
  version: baseline.version,
  sourceCodes: ['FLS-1'],
  objectiveId: 'goal',
  objectiveName: '图片选择',
  target: '独立选择',
  notes: '',
  confirmedBy: 'teacher',
  confirmedAt: '2026-10-09T12:00:00Z',
  paperId: '',
  homeworkId: '',
  followupAssessmentId: '',
};
let wrapper: VueWrapper;
function setup(denied = '', fail = '') {
  let plans: LearningPlan[] = [],
    followup: typeof baseline | undefined;
  auth.user = { id: 'teacher', name: '老师', username: 'teacher', role: 'TEACHER' };
  auth.permissions = [
    'students',
    'assessment_history',
    'ability_tracking',
    'questions',
    'papers',
    'assignments',
  ].map((moduleId) => ({
    role: 'TEACHER',
    moduleId,
    parentId: '',
    sortOrder: 1,
    uiAccess: true,
    apiAccess: moduleId !== denied,
  }));
  vi.mocked(allQuestions).mockResolvedValue([
    {
      id: 'q',
      stemText: '选图片',
      stemImage: '/picture.png',
      subject: 'LANGUAGE',
      grade: 1,
      type: 'MULTIPLE_CHOICE',
      answer: 'A',
      objectiveId: 'goal',
      options: [{ value: 'A', image: '/option.png' }],
    },
  ]);
  vi.mocked(request).mockImplementation(async (path, method = 'GET') => {
    if (path.includes(fail) && fail) throw new Error('加载失败');
    if (path === '/students/student')
      return {
        student: { id: 'student', name: '小明', username: 'xiaoming', status: 'active' },
        history: [],
        homework: plans[0]?.homeworkId
          ? [{ id: 'task', name: '图片训练', status: 'completed', correctCount: 1, total: '1' }]
          : [],
      };
    if (path.startsWith('/assessments/records?'))
      return [baseline, ...(followup ? [followup] : [])];
    if (path.includes('/catalog'))
      return peakDefinitionFixture([{ code: 'FLS-1', module: 'D', title: '看向评估者' }]);
    if (path.endsWith('/responses'))
      return [{ code: 'FLS-1', score: 0, response: '需要提示', notes: '课堂观察' }];
    if (path === '/assessments/methods') return [peakMethodFixture];
    if (path === '/skills')
      return [{ name: '视觉', objectives: [{ id: 'goal', name: '图片选择', target: '独立选择' }] }];
    if (path.endsWith('/assign')) {
      plans = [{ ...plans[0], homeworkId: 'task', paperId: 'paper' }];
      return plans[0];
    }
    if (path.endsWith('/reassessment')) {
      followup = { ...baseline, id: 'retest', status: 'ongoing' };
      plans = [{ ...plans[0], followupAssessmentId: 'retest' }];
      return plans[0];
    }
    if (path.endsWith('/comparison'))
      return {
        baseline,
        followup,
        items: [{ code: 'FLS-1', title: '看向评估者', before: { score: 0 }, after: null }],
      };
    if (method === 'POST') {
      plans = [newPlan];
      return newPlan;
    }
    return plans;
  });
  wrapper = mount(StudentProfile, {
    global: {
      stubs: {
        PageHeader: { props: ['title'], template: '<header>{{title}}<slot/></header>' },
        Feedback: { props: ['error'], template: '<p>{{error}}</p>' },
        EmptyState: {
          props: ['title', 'description'],
          template: '<p>{{title}} {{description}}</p>',
        },
        EditorDialog: {
          props: ['modelValue', 'dirty', 'saving'],
          template: '<div v-if="modelValue"><slot :close="() => {}"/></div>',
        },
        VDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot/></div>' },
        VForm: {
          emits: ['submit'],
          template:
            '<form @submit.prevent="$emit(\'submit\', Object.assign($event, { valid: true }))"><slot/></form>',
        },
        VBtn: {
          props: ['disabled', 'loading', 'to'],
          template: '<button :disabled="disabled || loading"><slot/></button>',
        },
        VCard: { props: ['title'], template: '<section><h2>{{title}}</h2><slot/></section>' },
        VTextField: field,
        VTextarea: field,
        VAutocomplete: select,
        VSelect: select,
        VCheckbox: checkbox,
        VSwitch: true,
        VCardText: slot,
        VCardActions: slot,
        VAvatar: true,
        VIcon: true,
        VSpacer: true,
        VChip: slot,
        VProgressLinear: true,
        VAlert: slot,
        VSnackbar: slot,
      },
    },
  });
}
async function click(label: string) {
  const button = wrapper.findAll('button').find((b) => b.text().startsWith(label));
  expect(button).toBeTruthy();
  await button!.trigger('click');
  await flushPromises();
}
afterEach(() => {
  wrapper?.unmount();
  auth.user = null;
  auth.permissions = [];
  vi.clearAllMocks();
});
describe('teacher workflow from one student profile', () => {
  it('requires explicit confirmation, selects illustrated training questions, assigns to the same student, and links a reassessment', async () => {
    setup();
    await flushPromises();
    expect(wrapper.text()).toContain('小明的学生档案');
    expect(wrapper.text()).toContain('需要提示');
    expect(request).not.toHaveBeenCalledWith(expect.anything(), 'POST', expect.anything());
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await click('确认教学目标');
    await wrapper.get('select[aria-label="关联教学目标"]').setValue('goal');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(request).toHaveBeenCalledWith(
      '/students/student/learning-plans',
      'POST',
      expect.objectContaining({
        assessmentId: 'baseline',
        sourceCodes: ['FLS-1'],
        objectiveId: 'goal',
        target: '独立选择',
      }),
    );
    await click('选择训练题并布置');
    expect(allQuestions).toHaveBeenCalledWith({ objectiveId: 'goal' });
    expect(wrapper.get('img[alt="训练题题干图片"]').attributes('src')).toBe('/picture.png');
    expect(wrapper.get('img[alt="选项 A"]').attributes('src')).toBe('/option.png');
    expect(
      wrapper
        .findAll('button')
        .find((b) => b.text() === '布置给学生')!
        .attributes('disabled'),
    ).toBeDefined();
    await wrapper.findAll('input[type="checkbox"]').at(-1)!.setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(request).toHaveBeenCalledWith(
      '/students/student/learning-plans/plan/assign',
      'POST',
      expect.objectContaining({ questionIds: ['q'] }),
    );
    expect(wrapper.text()).toContain('学生已提交');
    await click('开始复测');
    expect(request).not.toHaveBeenCalledWith(
      expect.stringContaining('/reassessment'),
      'POST',
      expect.anything(),
    );
    await click('创建复测');
    await click('复测对比');
    expect(wrapper.text()).toContain('未评 · 暂不比较');
    expect(wrapper.text()).toContain('评估中，结果待补全');
  });
  it('honors module permissions and does not load or write restricted goal data', async () => {
    setup('ability_tracking');
    await flushPromises();
    expect(request).not.toHaveBeenCalledWith('/skills');
    expect(request).not.toHaveBeenCalledWith('/students/student/learning-plans');
    expect(wrapper.text()).toContain('此评估的目标关联能力或当前账号权限尚未开放');
    expect(wrapper.get('input[type="checkbox"]').attributes('disabled')).toBeDefined();
  });
  it('shows loading failures without a misleading empty-state message', async () => {
    setup('', '/learning-plans');
    await flushPromises();
    expect(wrapper.text()).toContain('加载失败');
    expect(wrapper.text()).not.toContain('从一条评估发现开始');
  });
});

it('keeps equal record IDs separate by method and confirms a nonbinary finding with its method identity', async () => {
  setup();
  const original = vi.mocked(request).getMockImplementation()!;
  const other = {
    ...peakMethodFixture,
    id: 'observation',
    name: '观察方法',
    renderer: 'numeric',
    currentVersion: 'obs-v1',
    versions: ['obs-v1'],
  };
  const definition = {
    methodId: other.id,
    version: 'obs-v1',
    modules: [{ id: 'OBS', name: '观察' }],
    items: [{ code: 'FLS-1', module: 'OBS', title: '观察项目' }],
    scoring: { label: '观察值', options: [], min: 0, max: 3 },
    instructions: '',
  };
  vi.mocked(request).mockImplementation(async (path, verb, body) => {
    if (path === '/assessments/methods') return [peakMethodFixture, other];
    if (path.startsWith('/assessments/records?'))
      return [baseline, { ...baseline, methodId: other.id, version: 'obs-v1', module: 'OBS' }];
    if (path.includes('/methods/observation/catalog')) return definition;
    if (path.includes('/methods/observation/') && path.endsWith('/responses'))
      return [{ code: 'FLS-1', score: 2.5, response: '观察记录', notes: '' }];
    return original(path, verb, body);
  });
  await flushPromises();
  await wrapper
    .get('select[aria-label="用于确认目标的已完成评估"]')
    .setValue('observation:baseline');
  await flushPromises();
  expect(wrapper.text()).toContain('FLS-1 · 2.5');
  expect(wrapper.text()).not.toContain('未通过');
  expect(request).toHaveBeenCalledWith('/assessments/methods/observation/catalog?version=obs-v1');
  await wrapper.get('input[type="checkbox"]').setValue(true);
  await click('确认教学目标');
  await wrapper.get('select[aria-label="关联教学目标"]').setValue('goal');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(request).toHaveBeenCalledWith(
    '/students/student/learning-plans',
    'POST',
    expect.objectContaining({ methodId: 'observation', assessmentId: 'baseline' }),
  );
});
