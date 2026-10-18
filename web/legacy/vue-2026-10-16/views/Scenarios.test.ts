import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Scenarios from './Scenarios.vue';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { mode: 'preview' } }) }));
vi.mock('../lib/api', () => ({ request: vi.fn(), query: vi.fn() }));
afterEach(() => {
  auth.user = null;
  auth.permissions = [];
  vi.clearAllMocks();
});
it('keeps teacher game preview away from student records and formal sessions', async () => {
  auth.user = { id: 'teacher', username: 'teacher', name: '老师', role: 'TEACHER' };
  auth.permissions = [
    {
      role: 'TEACHER',
      moduleId: 'application_games',
      parentId: '',
      sortOrder: 1,
      uiAccess: true,
      apiAccess: true,
    },
  ];
  vi.mocked(request).mockResolvedValue([]);
  const wrapper = mount(Scenarios, {
    global: {
      stubs: {
        PageHeader: true,
        EmptyState: true,
        LifeGamePlayer: true,
        ProductArt: true,
        ScenarioLibrary: true,
        VBtn: true,
        VAlert: true,
        VProgressLinear: true,
        VDialog: true,
        VCard: true,
        VSelect: true,
        VPagination: true,
      },
    },
  });
  await flushPromises();
  expect(request).toHaveBeenCalledExactlyOnceWith('/scenarios');
  expect(wrapper.find('.life-records').exists()).toBe(false);
  wrapper.unmount();
});
