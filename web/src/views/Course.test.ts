import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Course from './Course.vue';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { pendingProgress, queueProgress, flushProgress } from '../lib/progress';
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  api: vi.fn(),
}));
vi.mock('../lib/progress', () => ({
  pendingProgress: vi.fn(() => ({})),
  queueProgress: vi.fn((_uid, p) => ({ ...p, queuedAt: Date.now() })),
  flushProgress: vi.fn(async () => {}),
}));
const stubs = {
  'a-button': {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled || loading"><slot/></button>',
  },
  'a-progress': true,
  PageState: {
    props: ['loading', 'error', 'empty'],
    template:
      '<div><p v-if="error">{{error}}</p><button v-if="error" @click="$emit(\'retry\')">重新加载</button></div>',
  },
};
const first = {
  id: 'one',
  title: '第一门课程',
  audience: 'parent',
  lessons: [
    { id: 'a', kind: 'text', title: '第一章', text: '第一章正文' },
    { id: 'b', kind: 'text', title: '第二章', text: '第二章正文' },
  ],
};
async function render(path = '/training/one') {
  auth.user = { id: 'parent', name: 'Parent', username: 'parent', role: 'PARENT' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/training/:id', component: Course },
      { path: '/training', component: { template: '<p>培训</p>' } },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router], stubs } });
  await flushPromises();
  return { router, wrapper };
}
afterEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  vi.mocked(pendingProgress).mockReturnValue({});
});
it('follows chapter URL changes without reloading the course or showing the old chapter', async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path === '/portal/progress' ? { progress: [] } : first,
  );
  const { router, wrapper } = await render();
  expect(wrapper.text()).toContain('第一章正文');
  await router.push('/training/one?lesson=b');
  await flushPromises();
  expect(wrapper.text()).toContain('第二章正文');
  expect(wrapper.text()).not.toContain('第一章正文');
  expect(vi.mocked(api).mock.calls.filter(([p]) => p === '/portal/courses/one')).toHaveLength(1);
  wrapper.unmount();
});
it('loads a new course when its route ID changes and ignores late old-course responses', async () => {
  let finish!: (v: unknown) => void;
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === '/portal/progress') return { progress: [] };
    if (path === '/portal/courses/one')
      return new Promise((resolve) => {
        finish = resolve;
      });
    return {
      id: 'two',
      title: '第二门课程',
      audience: 'teacher',
      lessons: [{ id: 'new', kind: 'text', title: '新章节', text: '新课程正文' }],
    };
  });
  const { router, wrapper } = await render();
  await router.push('/training/two');
  await flushPromises();
  expect(wrapper.text()).toContain('新课程正文');
  finish(first);
  await flushPromises();
  expect(wrapper.text()).toContain('第二门课程');
  expect(wrapper.text()).not.toContain('第一门课程');
  wrapper.unmount();
});
it('restores video position and saves the current position on pagehide', async () => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === '/portal/progress')
      return { progress: [{ lessonId: 'v', position: 42, completed: false }] };
    if (path.startsWith('/portal/media-link/')) return { url: '/local-video.mp4' };
    return {
      id: 'one',
      title: '视频课程',
      audience: 'parent',
      lessons: [{ id: 'v', kind: 'video', uploadId: 'file', title: '视频章节' }],
    };
  });
  const { wrapper } = await render();
  const video = wrapper.get('video').element as HTMLVideoElement;
  Object.defineProperty(video, 'duration', { value: 60 });
  await wrapper.get('video').trigger('loadedmetadata');
  expect(video.currentTime).toBe(42);
  video.currentTime = 48;
  window.dispatchEvent(new Event('pagehide'));
  await flushPromises();
  expect(queueProgress).toHaveBeenCalledWith(
    'parent',
    expect.objectContaining({ lessonId: 'v', position: 48, completed: false }),
  );
  expect(flushProgress).toHaveBeenCalledWith('parent');
  wrapper.unmount();
});
