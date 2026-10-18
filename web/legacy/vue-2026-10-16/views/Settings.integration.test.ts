import { afterEach, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import Settings from './Settings.vue';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
import { bodyButton, uiPlugin } from '../test/ui';

vi.mock('../lib/api', () => ({ request: vi.fn() }));
let wrapper: VueWrapper, router: Router;
const config = {
  globalEnabled: true,
  excludeMistakesFromPractice: false,
  stages: { 1: { label: '需要巩固', nextWrong: 1, nextCorrect: 1, showAnswer: false } },
};
async function setup(path = '/admin/config') {
  auth.user = { id: 'admin', role: 'ADMIN', name: '管理员', username: 'admin' };
  vi.mocked(request).mockImplementation(async (url, method) => {
    if (method === 'POST') return {};
    if (url === '/admin/config') return structuredClone(config);
    if (url === '/admin/settings') return { registrationEnabled: false };
    return [
      {
        role: 'STUDENT',
        moduleId: 'skills_practice',
        uiAccess: true,
        apiAccess: true,
        sortOrder: 1,
      },
    ];
  });
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/config', component: Settings },
      { path: '/permissions', component: Settings },
      { path: '/done', component: { template: '<p>已离开</p>' } },
    ],
  });
  await router.push(path);
  wrapper = mount(defineComponent({ template: '<v-app><router-view/></v-app>' }), {
    attachTo: document.body,
    global: {
      plugins: [router, uiPlugin(375)],
      stubs: {
        PageHeader: { template: '<header><slot/></header>' },
        Feedback: { props: ['error'], template: '<div>{{error}}<slot/></div>' },
      },
    },
  });
  await flushPromises();
}
afterEach(() => {
  wrapper?.unmount();
  document.body.replaceChildren();
  auth.user = null;
  auth.permissions = [];
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it('keeps an edited configuration on cancelled navigation and only leaves after discard', async () => {
  await setup();
  const input = wrapper.get('input[type="text"]');
  await input.setValue('未保存的阶段名');
  expect(wrapper.text()).toContain('有未保存的配置修改');
  let navigation = router.push('/done');
  await flushPromises();
  bodyButton('继续编辑');
  await navigation;
  expect(router.currentRoute.value.path).toBe('/admin/config');
  expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe(
    '未保存的阶段名',
  );
  navigation = router.push('/done');
  await flushPromises();
  bodyButton('放弃修改');
  await navigation;
  expect(router.currentRoute.value.path).toBe('/done');
  expect(vi.mocked(request).mock.calls.some(([, method]) => method === 'POST')).toBe(false);
});

it('asks before reloading and keeps failed saves dirty and retryable', async () => {
  await setup();
  await wrapper.get('input[type="text"]').setValue('待保存');
  const reads = vi.mocked(request).mock.calls.length;
  bodyButton('重新加载');
  await flushPromises();
  bodyButton('继续编辑');
  await flushPromises();
  expect(request).toHaveBeenCalledTimes(reads);
  vi.mocked(request).mockRejectedValueOnce(new Error('保存失败，请重试'));
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('保存失败，请重试');
  expect(wrapper.text()).toContain('有未保存的配置修改');
  expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('待保存');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('配置已加载');
  await router.push('/done');
  expect(router.currentRoute.value.path).toBe('/done');
});

it('protects permission changes and keeps a single save action', async () => {
  await setup('/permissions');
  expect(
    [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === '保存权限'),
  ).toHaveLength(1);
  const order = wrapper.get('input[type="number"]');
  await order.setValue('8');
  const navigation = router.push('/done');
  await flushPromises();
  bodyButton('继续编辑');
  await navigation;
  expect((wrapper.get('input[type="number"]').element as HTMLInputElement).value).toBe('8');
  expect(vi.mocked(request).mock.calls.some(([, method]) => method === 'POST')).toBe(false);
});
