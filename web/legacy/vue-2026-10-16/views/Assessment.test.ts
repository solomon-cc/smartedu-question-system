import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import Assessment from '../components/PeakAssessment.vue';
import { peakDefinitionFixture } from '../lib/assessmentFixtures';
import fullCatalog from '../../../assessment_data/peak.json';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
import type { Role } from '../lib/types';
const route = vi.hoisted(() => ({ query: {} as Record<string, string>, fullPath: '/assessment' }));
vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('../lib/api', () => ({ request: vi.fn() }));
const records = [
  { id: 'a', studentId: 'student', module: 'D', date: '2026-10-09', status: 'ongoing' },
  { id: 'b', studentId: 'student', module: 'G', date: '2026-10-08', status: 'completed' },
];
const catalog = [
  {
    module: 'D',
    category: 'FLS',
    code: 'FLS-1',
    itemNumber: 1,
    title: '教师专用提示',
    script: '参考答案',
    stimulusPages: [7],
    scriptPages: [6],
    responsePage: 0,
    note: '',
  },
];
let wrapper: VueWrapper;
function setup(role: Role, failure = false, definitions = catalog) {
  auth.user = { id: 'student', username: 'student', name: '体验学生', role };
  auth.permissions = [];
  vi.mocked(request).mockImplementation(async (path) => {
    if (failure) throw new Error('加载失败');
    if (path.includes('/catalog')) return peakDefinitionFixture(definitions);
    if (path.endsWith('/responses')) return [{ code: 'FLS-1', score: 0, response: '', notes: '' }];
    return records;
  });
  const slot = { template: '<div><slot/></div>' };
  wrapper = mount(Assessment, {
    global: {
      stubs: {
        PageHeader: { template: '<header><slot/></header>' },
        Feedback: true,
        LegacyAssessment: true,
        PeakSession: { name: 'PeakSession', template: '<p>图片施测界面</p>' },
        EmptyState: { props: ['title'], template: '<p>{{ title }}</p>' },
        VBtn: { props: ['disabled'], template: '<button :disabled="disabled"><slot/></button>' },
        VBtnToggle: { props: ['modelValue'], template: '<div><slot/></div>' },
        VDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot/></div>' },
        VCard: slot,
        VForm: {
          name: 'VForm',
          emits: ['submit'],
          template:
            '<form @submit.prevent="$emit(\'submit\', Object.assign($event, { valid: true }))"><slot/></form>',
        },
        VAutocomplete: {
          name: 'VAutocomplete',
          props: ['modelValue'],
          template: '<select><slot/></select>',
        },
        VSelect: true,
        VCardText: slot,
        VCardActions: slot,
        VSpacer: true,
        VChip: slot,
        VProgressLinear: true,
        VTabs: slot,
        VTab: slot,
        VList: slot,
        VListItem: slot,
        VListItemTitle: slot,
        VDataTable: true,
        VExpansionPanels: slot,
        VExpansionPanel: {
          props: ['title'],
          template: '<details><summary>{{title}}</summary><slot/></details>',
        },
        VExpansionPanelText: slot,
        VAlert: slot,
        VSnackbar: true,
      },
    },
  });
}
async function click(text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  expect(button).toBeTruthy();
  await button!.trigger('click');
  await flushPromises();
}
afterEach(() => {
  wrapper?.unmount();
  route.query = {};
  auth.user = null;
  auth.permissions = [];
  vi.clearAllMocks();
});
describe('assessment role experience', () => {
  it.each(['TEACHER', 'ADMIN'] as Role[])(
    '%s has one creation entry that opens the assessment form',
    async (role) => {
      setup(role);
      await flushPromises();
      expect(
        wrapper.findAll('button').filter((button) => button.text() === '新建 PEAK 评估'),
      ).toHaveLength(1);
      expect(wrapper.text()).not.toContain('开始一次评估');
      await click('新建 PEAK 评估');
      expect(wrapper.find('form').exists()).toBe(true);
      expect(request).not.toHaveBeenCalledWith(expect.anything(), 'POST', expect.anything());
    },
  );
  it('shows PEAK records and keeps the old instrument in the secondary archive', async () => {
    setup('STUDENT');
    await flushPromises();
    expect(wrapper.findAll('.assessment-records h3').map((n) => n.text())).toEqual([
      '直接训练预评估',
      '泛化预评估',
    ]);
    expect(wrapper.find('header').text()).not.toContain('VB-MAPP');
    expect(wrapper.find('details').text()).toContain('VB-MAPP 历史档案');
    expect(wrapper.text()).not.toContain('新建 PEAK');
  });
  it('gives students progress without exposing teacher prompts or opening administration', async () => {
    setup('STUDENT');
    await flushPromises();
    await click('查看进度');
    expect(wrapper.text()).toContain('我的评估进展');
    expect(wrapper.text()).toContain('待巩固');
    expect(wrapper.text()).toContain('未评项目不代表未通过');
    expect(wrapper.text()).not.toContain('教师专用提示');
    expect(wrapper.text()).not.toContain('图片施测界面');
    expect(wrapper.text()).not.toContain('继续施测');
  });
  it.each(['TEACHER', 'ADMIN'] as Role[])(
    '%s reviews progress before explicitly resuming image administration',
    async (role) => {
      setup(role);
      await flushPromises();
      await click('查看进度');
      expect(wrapper.text()).not.toContain('图片施测界面');
      await click('继续施测');
      expect(wrapper.text()).toContain('图片施测界面');
    },
  );
  it('does not show an empty record message on a load error', async () => {
    setup('STUDENT', true);
    await flushPromises();
    expect(wrapper.text()).not.toContain('还没有 PEAK 评估记录');
  });
});

it('updates the overview after saving and locks the interface after confirming completion', async () => {
  setup('TEACHER', false, fullCatalog);
  await flushPromises();
  await click('查看进度');
  const finishBefore = wrapper.findAll('button').find((button) => button.text() === '完成评估')!;
  expect(finishBefore.attributes('disabled')).toBeDefined();
  await click('继续施测');
  const session = wrapper.findComponent({ name: 'PeakSession' });
  for (const item of fullCatalog.filter((i) => i.module === 'D')) {
    session.vm.$emit('saved', { code: item.code, score: 1, response: '', notes: '' });
  }
  session.vm.$emit('close');
  await flushPromises();
  expect(wrapper.text()).toContain('64 / 64');
  expect(wrapper.text()).not.toContain('图片施测界面');
  expect(finishBefore.attributes('disabled')).toBeUndefined();
  vi.mocked(request).mockResolvedValueOnce({ ...records[0], status: 'completed' });
  await click('完成评估');
  await click('确认完成');
  expect(request).toHaveBeenLastCalledWith(
    '/assessments/methods/peak/records/a/complete',
    'POST',
    {},
  );
  expect(wrapper.text()).toContain('已完成 · 只读');
  expect(wrapper.text()).not.toContain('继续施测');
  expect(wrapper.text()).not.toContain('完成评估');
  await click('返回列表');
  expect(
    wrapper.findAll('.assessment-records button').every((button) => button.text() === '查看结果'),
  ).toBe(true);
});

it('creates a teacher-led PEAK assessment and opens the new record for administration', async () => {
  setup('TEACHER', false, fullCatalog);
  await flushPromises();
  vi.mocked(request).mockImplementation(async (path, method) => {
    if (path.includes('/catalog')) return peakDefinitionFixture(fullCatalog);
    if (path.endsWith('/responses')) return [];
    if (method === 'POST') return { ...records[0], id: 'created' };
    return [{ ...records[0], id: 'created' }];
  });
  await click('新建 PEAK 评估');
  wrapper.findComponent({ name: 'VAutocomplete' }).vm.$emit('update:modelValue', 'student');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(request).toHaveBeenCalledWith('/assessments/methods/peak/records', 'POST', {
    studentId: 'student',
    module: 'D',
    version: undefined,
  });
  expect(request).toHaveBeenCalledWith('/assessments/methods/peak/records/created/responses');
  expect(wrapper.text()).toContain('图片施测界面');
  expect(wrapper.findComponent({ name: 'PeakSession' }).attributes('assessment-id')).toBe(
    'created',
  );
});

it('keeps student context when opening an assessment from the profile', async () => {
  route.query = { studentId: 'student', assessmentId: 'b' };
  setup('TEACHER');
  await flushPromises();
  expect(request).toHaveBeenCalledWith('/assessments/methods/peak/records?studentId=student');
  expect(wrapper.text()).toContain('已完成 · 只读');
  expect(wrapper.text()).not.toContain('图片施测界面');
  expect(request).not.toHaveBeenCalledWith(expect.anything(), 'POST', expect.anything());
});

it('opens a prefilled creation form from the profile without creating a record on navigation', async () => {
  route.query = { studentId: 'student', new: '1' };
  setup('TEACHER');
  await flushPromises();
  expect(wrapper.findComponent({ name: 'VAutocomplete' }).props('modelValue')).toBe('student');
  expect(request).not.toHaveBeenCalledWith(expect.anything(), 'POST', expect.anything());
});
