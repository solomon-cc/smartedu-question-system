import { afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import Ability from './Ability.vue';
import { request } from '../lib/api';
import { auth } from '../stores/auth';
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { studentId: 's' } }) }));
vi.mock('../lib/api', () => ({ request: vi.fn() }));
afterEach(() => {
  auth.user = null;
  auth.permissions = [];
  vi.clearAllMocks();
});
it.each([true, false])(
  'loads an existing student link on arrival without requesting denied student access (%s)',
  async (hasStudents) => {
    auth.user = { id: 't', username: 't', name: '老师', role: 'TEACHER' };
    auth.permissions = hasStudents
      ? [
          {
            role: 'TEACHER',
            moduleId: 'students',
            parentId: '',
            sortOrder: 1,
            uiAccess: true,
            apiAccess: true,
          },
        ]
      : [];
    vi.mocked(request).mockResolvedValue([]);
    const wrapper = mount(Ability, {
      global: {
        stubs: {
          PageHeader: true,
          Feedback: true,
          EmptyState: true,
          EditorDialog: true,
          VBtn: true,
          VCard: true,
          VSelect: true,
          VDataTable: true,
          VExpansionPanels: true,
          VDialog: true,
          VSnackbar: true,
        },
      },
    });
    await flushPromises();
    expect(request).toHaveBeenCalledWith('/ability/matrix?studentId=s');
    expect(vi.mocked(request).mock.calls.some(([p]) => p === '/students')).toBe(hasStudents);
    wrapper.unmount();
  },
);
