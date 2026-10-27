import { expect, it, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import FileUpload from './FileUpload.vue';
import { uploadFile } from '../lib/uploads';
vi.mock('../lib/uploads', async () => ({
  ...(await vi.importActual<typeof import('../lib/uploads')>('../lib/uploads')),
  uploadFile: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const stubs = {
  'a-progress': true,
  'a-button': { template: '<button><slot/></button>' },
};
it('keeps the old attachment and clearly distinguishes a failed replacement', async () => {
  vi.mocked(uploadFile).mockRejectedValue(new Error('网络中断'));
  const wrapper = mount(FileUpload, {
    props: { modelValue: 'original', kind: 'document' },
    global: { stubs },
  });
  const input = wrapper.get('input');
  Object.defineProperty(input.element, 'files', {
    value: [new File(['new content'], 'replacement.pdf')],
  });
  await input.trigger('change');
  await flushPromises();
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  expect(wrapper.text()).toContain('原文件已保留');
  expect(wrapper.text()).toContain('新文件尚未替换原文件');
  expect(wrapper.text()).not.toContain('文件已保存');
  expect(wrapper.emitted('busy')).toEqual([[true], [false]]);
  await wrapper.setProps({ kind: 'video', modelValue: '' });
  expect(wrapper.text()).not.toContain('replacement.pdf');
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  wrapper.unmount();
});
it('rejects a document selected for a video lesson without starting a transfer', async () => {
  const wrapper = mount(FileUpload, {
    props: { modelValue: '', kind: 'video' },
    global: { stubs },
  });
  const input = wrapper.get('input');
  Object.defineProperty(input.element, 'files', { value: [new File(['pdf'], 'wrong.pdf')] });
  await input.trigger('change');
  expect(uploadFile).not.toHaveBeenCalled();
  expect(wrapper.get('[role="alert"]').text()).toContain('MP4');
  expect(wrapper.emitted('busy')).toBeUndefined();
  wrapper.unmount();
});
