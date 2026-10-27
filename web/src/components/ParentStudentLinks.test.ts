import { it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ParentStudentLinks from './ParentStudentLinks.vue';
import { api } from '../lib/api';
vi.mock('../lib/api', async () => ({ ...(await vi.importActual('../lib/api')), api: vi.fn() }));
vi.mock('./useLeaveGuard', () => ({ useLeaveGuard: () => ({ confirm: async () => true }) }));
it('blocks association edits when the existing links fail to load, then recovers on retry', async () => {
  vi.mocked(api)
    .mockRejectedValueOnce(new Error('关联加载失败'))
    .mockResolvedValueOnce([{ parentId: 'p', studentId: 's' }]);
  const wrapper = mount(ParentStudentLinks, {
    props: {
      users: [
        { id: 'p', name: '家长', username: 'p', role: 'PARENT', status: 'active' },
        { id: 's', name: '学生', username: 's', role: 'STUDENT', status: 'active' },
      ],
    },
    global: {
      stubs: {
        'a-alert': { template: '<div><slot/></div>' },
        'a-button': { template: '<button><slot/></button>' },
      },
    },
  });
  await flushPromises();
  expect(wrapper.text()).toContain('关联加载失败');
  expect(wrapper.find('select').exists()).toBe(false);
  await wrapper.get('button').trigger('click');
  await flushPromises();
  await wrapper.get('select').setValue('p');
  await flushPromises();
  expect((wrapper.get('input[type=checkbox]').element as HTMLInputElement).checked).toBe(true);
  expect(vi.mocked(api).mock.calls).toHaveLength(2);
  wrapper.unmount();
});
