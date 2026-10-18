import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import IslandChoices from './IslandChoices.vue';
const options = [
  { value: 'A', text: '超市', image: '/life/supermarket-v1.jpg' },
  { value: 'B', text: '学校' },
];
it('selects a choice through its full label and keeps the original answer code', async () => {
  const wrapper = mount(
    defineComponent({
      components: { IslandChoices },
      data: () => ({ answer: '', options }),
      template: '<IslandChoices v-model="answer" :options="options" />',
    }),
    { global: { stubs: { VIcon: true } } },
  );
  await wrapper.get('input[value="A"]').setValue(true);
  expect(wrapper.vm.answer).toBe('A');
  expect(wrapper.get('.selected').text()).toBe('超市');
  expect(wrapper.get('img').attributes('alt')).toBe('超市');
  wrapper.unmount();
});
it('supports multiple answers and locks selection after checking', async () => {
  const wrapper = mount(
    defineComponent({
      components: { IslandChoices },
      data: () => ({ answer: [] as string[], disabled: false, options }),
      template:
        '<IslandChoices v-model="answer" :options="options" multiple :disabled="disabled" />',
    }),
    { global: { stubs: { VIcon: true } } },
  );
  await wrapper.get('input[value="A"]').setValue(true);
  await wrapper.get('input[value="B"]').setValue(true);
  expect(wrapper.vm.answer).toEqual(['A', 'B']);
  await wrapper.get('input[value="A"]').setValue(false);
  expect(wrapper.vm.answer).toEqual(['B']);
  wrapper.vm.disabled = true;
  await wrapper.vm.$nextTick();
  await wrapper.get('input[value="A"]').trigger('change');
  expect(wrapper.vm.answer).toEqual(['B']);
  expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined();
  wrapper.unmount();
});
