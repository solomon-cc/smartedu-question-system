import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import CourseManager from './CourseManager.vue';
import { api } from '../lib/api';
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  api: vi.fn(),
}));
vi.mock('../components/useLeaveGuard', () => ({
  useLeaveGuard: () => ({ confirm: async () => true }),
}));
const Input = defineComponent({
  name: 'AInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"/>',
});
const Select = defineComponent({
  name: 'ASelect',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div><slot/></div>',
});
let nextFileInstance = 0;
const File = defineComponent({
  name: 'FileUpload',
  props: ['modelValue'],
  setup() {
    return { instance: ++nextFileInstance };
  },
  template: '<span :data-instance="instance">{{modelValue}}</span>',
});
const stubs = {
  'a-input': Input,
  'a-textarea': Input,
  'a-select': Select,
  'a-form': { template: '<form><slot/></form>' },
  'a-form-item': { template: '<div><slot/></div>' },
  'a-radio-group': { template: '<div><slot/></div>' },
  'a-radio': { template: '<div><slot/></div>' },
  'a-alert': { template: '<p role="alert"><slot/></p>' },
  'a-button': {
    props: ['disabled', 'loading'],
    template: '<button type="button" :disabled="disabled || loading"><slot/></button>',
  },
  PageState: { props: ['error'], template: '<p>{{error}}</p>' },
  FileUpload: File,
};
const course = (overrides = {}) => ({
  id: 'course',
  title: '家长课程',
  summary: '',
  audience: 'parent',
  instructor: '老师',
  ownerId: 'owner',
  published: false,
  visibility: 'all',
  userIds: [],
  lessons: [],
  ...overrides,
});
async function render(c = course(), failRecipients = false) {
  vi.mocked(api).mockImplementation(async (path, method) => {
    if (path === '/portal/recipients') {
      if (failRecipients) throw new Error('学员暂时无法加载');
      return [];
    }
    if (!method) return [c];
    return c;
  });
  const wrapper = mount(CourseManager, { global: { stubs } });
  await flushPromises();
  return wrapper;
}
afterEach(() => vi.clearAllMocks());
it('keeps course management usable when recipients fail to load', async () => {
  const wrapper = await render(course(), true);
  expect(wrapper.text()).toContain('家长课程');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '编辑课程')!
    .trigger('click');
  expect(wrapper.find('h1').text()).toBe('编辑课程');
  wrapper.unmount();
});
it('clears stale assigned accounts when saving a course for all users', async () => {
  const wrapper = await render(course({ visibility: 'assigned', userIds: ['inactive'] }));
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '编辑课程')!
    .trigger('click');
  const visibility = wrapper
    .findAllComponents(Select)
    .find((c) => c.props('modelValue') === 'assigned')!;
  visibility.vm.$emit('update:modelValue', 'all');
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '保存课程')!
    .trigger('click');
  await flushPromises();
  expect(api).toHaveBeenCalledWith(
    '/portal/manage/courses/course',
    'PUT',
    expect.objectContaining({ visibility: 'all', userIds: [] }),
  );
  wrapper.unmount();
});
it('identifies an incomplete chapter before sending a save request', async () => {
  const wrapper = await render(
    course({
      lessons: [{ id: '', title: '第一节', kind: 'text', text: '', uploadId: '', duration: 0 }],
    }),
  );
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '编辑课程')!
    .trigger('click');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '保存课程')!
    .trigger('click');
  expect(wrapper.get('[role="alert"]').text()).toContain('第 1 节的正文');
  expect(
    vi.mocked(api).mock.calls.some(([, method]) => method === 'PUT' || method === 'POST'),
  ).toBe(false);
  wrapper.unmount();
});
it('requires a recipient for an assigned course', async () => {
  const wrapper = await render(course({ visibility: 'assigned' }));
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '编辑课程')!
    .trigger('click');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '保存课程')!
    .trigger('click');
  expect(wrapper.get('[role="alert"]').text()).toContain('至少一位学员');
  expect(vi.mocked(api).mock.calls.some(([, method]) => method === 'PUT')).toBe(false);
  wrapper.unmount();
});
it.each([false, true])(
  'only allows a course without chapters to be saved as a draft (published=%s)',
  async (published) => {
    const wrapper = await render(course({ published }));
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '编辑课程')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '保存课程')!
      .trigger('click');
    await flushPromises();
    expect(vi.mocked(api).mock.calls.some(([, method]) => method === 'PUT')).toBe(!published);
    if (published) expect(wrapper.get('[role="alert"]').text()).toContain('至少添加一个章节');
    wrapper.unmount();
  },
);
it('keeps each upload component attached to its chapter when new chapters are reordered', async () => {
  const wrapper = await render(
    course({
      lessons: [
        { id: '', title: '视频一', kind: 'video', text: '', uploadId: 'file-one', duration: 0 },
        { id: '', title: '视频二', kind: 'video', text: '', uploadId: 'file-two', duration: 0 },
      ],
    }),
  );
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '编辑课程')!
    .trigger('click');
  const original = wrapper
    .findAllComponents(File)
    .map((c) => c.get('span').attributes('data-instance'));
  await wrapper.findAll('[aria-label="下移章节"]')[0]!.trigger('click');
  const reordered = wrapper.findAllComponents(File);
  expect(reordered.map((c) => c.props('modelValue'))).toEqual(['file-two', 'file-one']);
  expect(reordered.map((c) => c.get('span').attributes('data-instance'))).toEqual([
    original[1],
    original[0],
  ]);
  wrapper.unmount();
});
