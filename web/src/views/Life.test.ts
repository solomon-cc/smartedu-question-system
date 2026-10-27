import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Life from './Life.vue';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { mode: 'preview' } }) }));
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  api: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  auth.permissions = [];
});
it('teacher preview-only entry does not fetch students or persisted learning records', async () => {
  auth.user = { id: 'teacher', username: 'teacher', name: 'Teacher', role: 'TEACHER' };
  auth.permissions = [
    { moduleId: 'application_games', uiAccess: true, apiAccess: true },
    { moduleId: 'students', uiAccess: true, apiAccess: true },
  ];
  vi.mocked(api).mockResolvedValue([]);
  const wrapper = mount(Life, {
    global: { stubs: { PageState: true, LifePlayer: true, 'a-modal': true, 'a-button': true } },
  });
  await flushPromises();
  expect(api).toHaveBeenCalledExactlyOnceWith('/scenarios');
  expect(wrapper.find('.life-history').exists()).toBe(false);
  wrapper.unmount();
});
