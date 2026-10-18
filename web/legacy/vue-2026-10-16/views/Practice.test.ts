import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import Practice from './Practice.vue';
import { auth } from '../stores/auth';
import { request, allQuestions } from '../lib/api';
import type { Role } from '../lib/types';
const guard = vi.hoisted(() => vi.fn());
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { subject: 'MATH', grade: '1' } }),
  onBeforeRouteLeave: guard,
}));
vi.mock('../lib/api', () => ({ request: vi.fn(), allQuestions: vi.fn() }));
const field = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\',$event.target.value)" />',
});
const button = defineComponent({
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot/></button>',
});
let wrapper: VueWrapper;
async function setup(role: Role) {
  auth.user = { id: 'test', username: 'test', name: '体验', role };
  vi.mocked(allQuestions).mockResolvedValue([
    { id: 'q', subject: 'MATH', grade: 1, type: 'FILL_BLANK', stemText: '1+1=?', answer: '2' },
  ]);
  vi.mocked(request).mockResolvedValue([]);
  wrapper = mount(Practice, {
    global: {
      stubs: {
        PageHeader: { props: ['description'], template: '<header>{{description}}<slot/></header>' },
        Feedback: true,
        EmptyState: true,
        RewardGame: true,
        VCard: { template: '<section><slot/></section>' },
        VBtn: button,
        VTextField: field,
        VChip: { template: '<span><slot/></span>' },
        VIcon: true,
        VAvatar: true,
        VAlert: { template: '<div><slot/></div>' },
        VProgressLinear: true,
        VDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot/></div>' },
        VCardText: { template: '<div><slot/></div>' },
        VCardActions: { template: '<div><slot/></div>' },
        VSpacer: true,
      },
    },
  });
  await flushPromises();
}
function btn(label: string) {
  const found = wrapper.findAll('button').find((b) => b.text() === label);
  if (!found) throw Error(label);
  return found;
}
afterEach(() => {
  wrapper?.unmount();
  auth.user = null;
  vi.clearAllMocks();
});
describe('formal practice and classroom preview', () => {
  it('lets teachers preview the full question without creating a learning record', async () => {
    await setup('TEACHER');
    expect(wrapper.text()).toContain('课堂预览');
    await wrapper.get('input').setValue('2');
    await btn('确认答案').trigger('click');
    await btn('完成练习').trigger('click');
    expect(wrapper.text()).toContain('课堂预览完成');
    expect(wrapper.text()).not.toContain('保存学习记录');
    expect(guard.mock.calls.at(-1)![0]()).toBe(true);
    expect(request).not.toHaveBeenCalledWith('/history', expect.anything(), expect.anything());
  });
  it('preserves student saving and protects completed but unsaved answers', async () => {
    await setup('STUDENT');
    const leave = guard.mock.calls.at(-1)![0];
    expect(leave()).toBe(true);
    await wrapper.get('input').setValue('2');
    await btn('确认答案').trigger('click');
    await btn('完成练习').trigger('click');
    const pending = leave();
    await flushPromises();
    expect(wrapper.text()).toContain('尚未保存的练习记录将丢失');
    await btn('继续练习').trigger('click');
    expect(await pending).toBe(false);
    await btn('保存学习记录').trigger('click');
    await flushPromises();
    expect(request).toHaveBeenCalledWith(
      '/history',
      'POST',
      expect.objectContaining({ correctCount: 1, total: '1' }),
    );
    expect(wrapper.text()).toContain('学习记录已保存');
    expect(leave()).toBe(true);
  });
});
