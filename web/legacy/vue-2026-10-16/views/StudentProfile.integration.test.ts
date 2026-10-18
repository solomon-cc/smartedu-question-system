import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import StudentProfile from './StudentProfile.vue';
import { peakDefinitionFixture, peakMethodFixture } from '../lib/assessmentFixtures';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 's' }, query: {} }) }));
vi.mock('../lib/api', () => ({ request: vi.fn(), allQuestions: vi.fn() }));
afterEach(() => {
  document.body.replaceChildren();
  auth.user = null;
  auth.permissions = [];
  vi.unstubAllGlobals();
});
it('renders real Vuetify controls and rejects an unfilled confirmation form', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('visualViewport', { addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  auth.user = { id: 'teacher', name: '老师', username: 'teacher', role: 'TEACHER' };
  auth.permissions = ['students', 'assessment_history', 'ability_tracking'].map((moduleId) => ({
    role: 'TEACHER',
    moduleId,
    parentId: '',
    uiAccess: true,
    apiAccess: true,
    sortOrder: 1,
  }));
  vi.mocked(request).mockImplementation(async (path) => {
    if (path === '/students/s')
      return {
        student: { name: '小明', username: 's', status: 'active' },
        homework: [],
        history: [],
      };
    if (path.startsWith('/assessments/records?'))
      return [
        {
          methodId: 'peak',
          version: peakMethodFixture.currentVersion,
          id: 'a',
          studentId: 's',
          date: '2026-10-09',
          module: 'D',
          status: 'completed',
        },
      ];
    if (path.includes('/catalog'))
      return peakDefinitionFixture([{ code: 'FLS-1', title: '看向评估者', module: 'D' }]);
    if (path.endsWith('/responses'))
      return [{ code: 'FLS-1', score: 0, response: '需要提示', notes: '' }];
    if (path === '/assessments/methods') return [peakMethodFixture];
    if (path === '/skills')
      return [{ name: '视觉', objectives: [{ id: 'g', name: '图片选择', target: '独立选择' }] }];
    return [];
  });
  const wrapper = mount(StudentProfile, {
    attachTo: document.body,
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: {
        PageHeader: { template: '<header><slot/></header>' },
        EditorDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot :close="() => {}"/></div>',
        },
        RouterLink: { template: '<a><slot/></a>' },
      },
    },
  });
  try {
    await flushPromises();
    await wrapper.get('.finding-row input').setValue(true);
    const button = wrapper.findAll('button').find((b) => b.text().startsWith('确认教学目标'))!;
    await button.trigger('click');
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('请填写此项');
    expect(request).not.toHaveBeenCalledWith(expect.anything(), 'POST', expect.anything());
    expect(wrapper.findAll('.v-input--error').length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(
      wrapper.get('.v-input--error input:not([type="hidden"])').element,
    );
  } finally {
    wrapper.unmount();
  }
});
