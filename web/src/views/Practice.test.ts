import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Practice from './Practice.vue';
import ArcoVue from '@arco-design/web-vue';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { subject: 'MATH', grade: '1' } }),
  onBeforeRouteUpdate: vi.fn(),
}));
vi.mock('../components/useLeaveGuard', () => ({
  useLeaveGuard: () => ({ confirm: async () => true }),
}));
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  api: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
  auth.user = null;
});
it('freezes the answer while saving and prevents a second submission after feedback', async () => {
  auth.user = { id: 's', name: 'Student', username: 's', role: 'STUDENT' };
  let finish!: (value: unknown) => void;
  vi.mocked(api).mockImplementation(async (_path, method) =>
    method === 'POST'
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : [{ id: 'q', stemText: '1 + 1 = ?', type: 'FILL_BLANK', options: [] }],
  );
  const wrapper = mount(Practice, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot/></a>' },
        PageState: true,
        'a-radio': true,
        'a-radio-group': true,
        'a-checkbox': true,
        'a-checkbox-group': true,
        'a-progress': true,
        'a-alert': { template: '<div><slot/></div>' },
        'a-button': {
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot/></button>',
        },
        'a-input': {
          props: ['modelValue', 'disabled', 'size'],
          emits: ['update:modelValue', 'pressEnter'],
          template:
            '<input :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'pressEnter\')" />',
        },
      },
    },
  });
  await flushPromises();
  await wrapper.get('input').setValue('2');
  await wrapper.get('.question-actions button').trigger('click');
  expect(wrapper.get('input').attributes('disabled')).toBeDefined();
  await wrapper.get('input').trigger('keydown.enter');
  expect(vi.mocked(api).mock.calls.filter(([, method]) => method === 'POST')).toHaveLength(1);
  finish({ correct: true, answer: '2', hint: '' });
  await flushPromises();
  await wrapper.get('input').trigger('keydown.enter');
  expect(vi.mocked(api).mock.calls.filter(([, method]) => method === 'POST')).toHaveLength(1);
  expect(wrapper.text()).toContain('回答正确');
  wrapper.unmount();
});

it('retries uncertain submissions with the same request ID and frozen answer', async () => {
  auth.user = { id: 's', name: 'Student', username: 's', role: 'STUDENT' };
  let posts = 0;
  vi.mocked(api).mockImplementation(async (_path, method) => {
    if (method !== 'POST')
      return [{ id: 'q', stemText: '1 + 1 = ?', type: 'FILL_BLANK', options: [] }];
    if (++posts === 1) throw new Error('连接失败');
    return {
      correct: true,
      answer: '2',
      reward: {
        id: 'r',
        type: 'text',
        name: '做得好',
        prompt: '继续尝试',
        duration: 30,
        image: '',
      },
    };
  });
  const wrapper = mount(Practice, {
    global: {
      stubs: {
        RouterLink: true,
        PageState: true,
        'a-progress': true,
        'a-checkbox': true,
        'a-checkbox-group': true,
        'a-radio': true,
        'a-radio-group': true,
        'a-modal': true,
        'a-alert': { template: '<div><slot/></div>' },
        'a-button': {
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot/></button>',
        },
        'a-input': {
          props: ['modelValue', 'disabled', 'size'],
          emits: ['update:modelValue'],
          template: `<input :disabled="disabled" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"/>`,
        },
      },
    },
  });
  await flushPromises();
  await wrapper.get('input').setValue('2');
  await wrapper.get('.question-actions button').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('重试提交');
  expect(wrapper.get('input').attributes('disabled')).toBeDefined();
  await wrapper.get('.question-actions button').trigger('click');
  await flushPromises();
  const calls = vi.mocked(api).mock.calls.filter(([, method]) => method === 'POST');
  expect(calls).toHaveLength(2);
  expect(calls[1]?.[2]).toEqual(calls[0]?.[2]);
  expect(calls[0]?.[2]).toMatchObject({ answer: '2', requestId: expect.any(String) });
  expect(wrapper.text()).toContain('做得好');
  wrapper.unmount();
});

const optionQuestion = (id: string, type = 'MULTIPLE_CHOICE') => ({
  id,
  stemText: id === 'second' ? '下一道题' : '选择正确的数量',
  type,
  options: [
    { value: 'A', text: '一个' },
    { value: 'B', text: '两个' },
    { value: 'C', text: '三个' },
  ],
});
function renderOptions() {
  return mount(Practice, {
    global: {
      plugins: [ArcoVue],
      stubs: {
        RouterLink: { template: '<a><slot/></a>' },
        PageState: true,
      },
    },
  });
}
it('identifies the submitted and correct choices without replacing content with option codes', async () => {
  auth.user = { id: 's', name: '学生', username: 's', role: 'STUDENT' };
  vi.mocked(api).mockImplementation(async (_path, method) =>
    method === 'POST'
      ? { correct: false, answer: 'C', hint: '再数一数。' }
      : [optionQuestion('first')],
  );
  const wrapper = renderOptions();
  await flushPromises();
  expect(wrapper.get('input[value="A"]').attributes('name')).toBe('practice-choice');
  await wrapper.get('input[value="A"]').setValue(true);
  await wrapper.get('.question-actions button').trigger('click');
  await flushPromises();
  expect(wrapper.get('.answer-wrong').text()).toContain('你的选择');
  expect(wrapper.get('.answer-right').text()).toContain('三个');
  expect(wrapper.get('.answer-right').text()).toContain('正确答案');
  expect(wrapper.get('.answer-feedback').text()).toContain('正确答案：三个');
  expect(wrapper.get('input[value="A"]').attributes('disabled')).toBeDefined();
  expect(wrapper.get('.practice-progress').text()).toContain('1 / 1');
  wrapper.unmount();
});
it('handles multiple selections and keeps correct omitted options visible in feedback', async () => {
  auth.user = { id: 's', name: '学生', username: 's', role: 'STUDENT' };
  vi.mocked(api).mockImplementation(async (_path, method) =>
    method === 'POST'
      ? { correct: false, answer: ' A， C ', hint: '' }
      : [optionQuestion('multiple', 'MULTIPLE_SELECT')],
  );
  const wrapper = renderOptions();
  await flushPromises();
  await wrapper.get('input[value="A"]').setValue(true);
  await wrapper.get('input[value="B"]').setValue(true);
  expect(wrapper.text()).toContain('已选 2 项');
  await wrapper.get('.question-actions button').trigger('click');
  await flushPromises();
  expect(vi.mocked(api).mock.calls.find(([, method]) => method === 'POST')?.[2]).toMatchObject({
    answer: 'A,B',
  });
  expect(wrapper.findAll('.answer-right')).toHaveLength(2);
  expect(wrapper.get('.answer-wrong').text()).toContain('两个');
  expect(wrapper.get('.correct-answer').text()).toContain('一个、三个');
  wrapper.unmount();
});
it('advances to a fresh question and updates progress after submission', async () => {
  auth.user = { id: 's', name: '学生', username: 's', role: 'STUDENT' };
  vi.mocked(api).mockImplementation(async (_path, method) =>
    method === 'POST'
      ? { correct: true, answer: 'C', hint: '' }
      : [optionQuestion('first'), optionQuestion('second')],
  );
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scroll,
  });
  const wrapper = renderOptions();
  await flushPromises();
  await wrapper.get('input[value="C"]').setValue(true);
  await wrapper.get('.question-actions button').trigger('click');
  await flushPromises();
  expect(wrapper.get('.practice-progress').text()).toContain('1 / 2');
  await wrapper.get('.question-actions button').trigger('click');
  await flushPromises();
  expect(wrapper.get('h1').text()).toBe('下一道题');
  expect(wrapper.find('.answer-feedback').exists()).toBe(false);
  expect(wrapper.get('.question-actions button').attributes('disabled')).toBeDefined();
  expect(scroll).toHaveBeenCalled();
  wrapper.unmount();
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});
