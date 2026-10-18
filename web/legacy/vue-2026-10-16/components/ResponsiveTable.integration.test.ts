import { afterEach, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { uiPlugin } from '../test/ui';
let wrapper: VueWrapper;
afterEach(() => {
  wrapper?.unmount();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
const host = defineComponent({
  setup() {
    return {
      selected: ref([]),
      viewed: ref(''),
      headers: [
        { title: '学生', key: 'name' },
        { title: '操作', key: 'actions', sortable: false },
      ],
      items: [{ id: 'child', name: '学生甲' }],
    };
  },
  template: `<v-app><v-data-table v-model="selected" show-select :items="items" :headers="headers" item-value="id"><template #item.actions="{item}"><v-btn @click="viewed=item.id">查看档案</v-btn></template></v-data-table><output>{{viewed}}:{{selected.join(',')}}</output></v-app>`,
});
it.each([375, 768, 1440])('keeps row actions and selection at viewport %i', async (width) => {
  wrapper = mount(host, { attachTo: document.body, global: { plugins: [uiPlugin(width)] } });
  await flushPromises();
  expect(wrapper.find('.v-data-table__tr--mobile').exists()).toBe(width < 600);
  if (width < 600)
    expect(wrapper.findAll('.v-data-table__td-title').map((s) => s.text())).toContain('学生');
  const row = wrapper.get('tbody tr');
  (row.get('input[type="checkbox"]').element as HTMLInputElement).click();
  await flushPromises();
  await row.get('button').trigger('click');
  await flushPromises();
  expect(wrapper.get('output').text()).toBe('child:child');
});
