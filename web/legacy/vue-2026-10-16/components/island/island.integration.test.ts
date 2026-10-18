import { afterEach, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { IslandButton, IslandInput, IslandSelect } from './index';
import { auth } from '../../stores/auth';
let wrapper: ReturnType<typeof mount>;
afterEach(() => {
  wrapper?.unmount();
  auth.user = null;
  auth.permissions = [];
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
function setup() {
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
  auth.user = { id: 'student', name: '学生', username: 'student', role: 'STUDENT' };
  const host = defineComponent({
    components: { IslandButton, IslandInput, IslandSelect },
    setup() {
      const name = ref(''),
        grade = ref(1),
        sent = ref('');
      return { name, grade, sent, required: (v: string) => !!v || '请填写姓名' };
    },
    template: `<v-app><v-form @submit.prevent="sent=name"><IslandInput v-model="name" label="姓名" :rules="[required]"/><IslandSelect v-model="grade" label="年级" :items="[{title:'一年级',value:1},{title:'二年级',value:2}]"/><IslandButton type="submit">保存</IslandButton><output>{{sent}}</output></v-form></v-app>`,
  });
  wrapper = mount(host, {
    attachTo: document.body,
    global: { plugins: [createVuetify({ components, directives })] },
  });
}
it('forwards real text models, select options, form rules and native submit through Vue adapters', async () => {
  setup();
  await flushPromises();
  const input = wrapper.get('.island-input input');
  await input.setValue('小明');
  await input.trigger('blur');
  await flushPromises();
  await wrapper.get('button').trigger('click');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.get('output').text()).toBe('小明');
  await input.setValue('');
  await input.trigger('blur');
  await flushPromises();
  expect(wrapper.text()).toContain('请填写姓名');
  await wrapper.get('.v-select .v-field').trigger('mousedown');
  await flushPromises();
  const options = [...document.querySelectorAll('[role="option"]')];
  expect(options.map((e) => e.textContent)).toContain('二年级');
  (options.find((e) => e.textContent === '二年级') as HTMLElement).click();
  await flushPromises();
  expect(wrapper.get('.v-select').text()).toContain('二年级');
});
it('activates island styles only for students, preserving teacher and admin controls', async () => {
  setup();
  await flushPromises();
  expect(wrapper.find('.island-button').exists()).toBe(true);
  for (const role of ['TEACHER', 'ADMIN'] as const) {
    auth.user!.role = role;
    await flushPromises();
    expect(wrapper.find('.island-button').exists()).toBe(false);
    expect(wrapper.find('.v-text-field input[type="text"]').exists()).toBe(true);
  }
});
