import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import Mood from './Mood.vue';
import { request, query } from '../lib/api';
import { auth } from '../stores/auth';
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  request: vi.fn(),
}));
let wrapper: VueWrapper;
const slot = { template: '<div><slot/></div>' };
const stubs = {
  PageHeader: { props: ['title'], template: '<header>{{title}}<slot/></header>' },
  EditorDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot :close="()=>{}"/></div>',
  },
  VBtn: {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled||loading"><slot/></button>',
  },
  VCard: slot,
  VCardTitle: slot,
  VCardText: slot,
  VCardActions: slot,
  VAlert: slot,
  VChip: slot,
  VSelect: {
    props: ['label', 'modelValue'],
    template:
      '<select :aria-label="label" :value="modelValue" @change="$emit(\'update:modelValue\',$event.target.value)"><option value="">全部</option><option value="student">学生自述</option></select>',
  },
  VTextField: {
    props: ['label', 'modelValue'],
    template:
      '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\',$event.target.value)"/>',
  },
  VTextarea: {
    props: ['label', 'modelValue'],
    template:
      '<textarea :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\',$event.target.value)"/>',
  },
  VIcon: true,
  VProgressLinear: true,
  VSpacer: true,
  VDivider: true,
  VSlider: true,
  VPagination: true,
  EmptyState: true,
};
const diary = {
  id: 'diary',
  studentId: 'child',
  date: '2026-10-09',
  source: 'student',
  mood: 2,
  intensity: 4,
  event: '今天有些累',
  feeling: '累',
};
async function click(text: string) {
  const b = wrapper.findAll('button').find((b) => b.text() === text);
  expect(b).toBeTruthy();
  await b!.trigger('click');
  await flushPromises();
}
afterEach(() => {
  wrapper?.unmount();
  auth.user = null;
  auth.permissions = [];
  vi.clearAllMocks();
});
it('teacher filters student self-reports and saves follow-up separately from the diary', async () => {
  auth.user = { id: 'teacher', name: '老师', username: 'teacher', role: 'TEACHER' };
  auth.permissions = [];
  vi.mocked(request).mockImplementation(async (path, method, body) => {
    if (path === '/mood-diaries/students') return [{ id: 'child', name: '学生甲' }];
    if (path.includes('/observations'))
      return method === 'POST'
        ? { id: 'note', createdAt: '2026-10-09', notes: (body as { notes: string }).notes }
        : [];
    return { list: [diary], total: 1 };
  });
  wrapper = mount(Mood, { global: { stubs } });
  await flushPromises();
  expect(wrapper.text()).toContain('学生甲');
  expect(wrapper.text()).toContain('学生自述');
  expect(wrapper.text()).not.toContain('选一张心情图片');
  await wrapper.get('[aria-label="记录来源"]').setValue('student');
  await flushPromises();
  expect(vi.mocked(request).mock.calls.some(([p]) => p.includes('source=student'))).toBe(true);
  await click('查看与跟进');
  await wrapper.get('[aria-label="本次跟进备注"]').setValue('提供安静的休息时间');
  await click('保存跟进');
  expect(request).toHaveBeenCalledWith('/mood-diaries/diary/observations', 'POST', {
    notes: '提供安静的休息时间',
  });
  expect(wrapper.text()).toContain('提供安静的休息时间');
  expect(
    vi.mocked(request).mock.calls.some(([p, m]) => p === '/mood-diaries' && m === 'POST'),
  ).toBe(false);
});
it('student records own feelings without teacher filters or follow-up controls', async () => {
  auth.user = { id: 'child', name: '学生甲', username: 'child', role: 'STUDENT' };
  vi.mocked(request).mockImplementation(async (path, method) =>
    method === 'POST' ? diary : { list: [diary], total: 1 },
  );
  wrapper = mount(Mood, { global: { stubs } });
  await flushPromises();
  expect(wrapper.find('[aria-label="学生"]').exists()).toBe(false);
  expect(wrapper.text()).not.toContain('查看与跟进');
  await click('很开心');
  await click('保存记录');
  expect(request).toHaveBeenCalledWith(
    '/mood-diaries',
    'POST',
    expect.objectContaining({ mood: 4 }),
  );
  expect(vi.mocked(request).mock.calls.every(([p]) => !p.includes('observations'))).toBe(true);
});
it('keeps a student-directory error separate from the loaded mood history', async () => {
  auth.user = { id: 't', username: 't', name: '老师', role: 'TEACHER' };
  vi.mocked(request).mockImplementation(async (path) => {
    if (path === '/mood-diaries/students') throw new Error('列表暂不可用');
    return { list: [diary], total: 1 };
  });
  wrapper = mount(Mood, { global: { stubs } });
  await flushPromises();
  expect(wrapper.text()).toContain('学生姓名暂时无法加载');
  expect(wrapper.text()).toContain('今天有些累');
  expect(wrapper.text()).not.toContain('此筛选下没有记录');
});
it('ignores an older filter response arriving after the newest response', async () => {
  auth.user = { id: 't', username: 't', name: '老师', role: 'TEACHER' };
  let finishOlder!: (data: unknown) => void;
  vi.mocked(request).mockImplementation(async (path) => {
    if (path === '/mood-diaries/students') return [];
    if (path.includes('dateFrom=2026-10-10'))
      return new Promise((resolve) => {
        finishOlder = resolve;
      });
    if (path.includes('dateFrom=2026-10-11'))
      return { list: [{ ...diary, event: '最新记录' }], total: 1 };
    return { list: [], total: 0 };
  });
  wrapper = mount(Mood, { global: { stubs } });
  await flushPromises();
  await wrapper.get('[aria-label="开始日期"]').setValue('2026-10-10');
  await wrapper.get('[aria-label="开始日期"]').setValue('2026-10-11');
  await flushPromises();
  finishOlder({ list: [{ ...diary, event: '过期记录' }], total: 1 });
  await flushPromises();
  expect(wrapper.text()).toContain('最新记录');
  expect(wrapper.text()).not.toContain('过期记录');
});
