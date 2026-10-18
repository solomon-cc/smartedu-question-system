import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PeakSession from './PeakSession.vue';
import catalog from '../../../assessment_data/peak.json';
import type { PeakItem } from '../lib/peak';
import { request } from '../lib/api';
vi.mock('../lib/api', () => ({ request: vi.fn() }));
const routeGuard = vi.hoisted(() => ({
  callback: undefined as undefined | (() => boolean | Promise<boolean>),
}));
vi.mock('vue-router', () => ({
  onBeforeRouteUpdate: vi.fn(),
  onBeforeRouteLeave: (callback: () => boolean | Promise<boolean>) => {
    routeGuard.callback = callback;
  },
}));
const button = defineComponent({
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>',
});
const dialog = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
});
const items = [
  {
    module: 'D',
    category: 'FLS',
    code: 'FLS-2',
    itemNumber: 2,
    title: '寻找隐藏的积木',
    script: '参考答案：左边的杯子',
    scriptPages: [6, 8],
    stimulusPages: [7, 9],
    responsePage: 0,
    note: '',
  },
  {
    module: 'D',
    category: 'FLS',
    code: 'FLS-3',
    itemNumber: 3,
    title: '边指边数星星',
    script: '参考答案',
    scriptPages: [10],
    stimulusPages: [11],
    responsePage: 0,
    note: '',
  },
] as PeakItem[];
let wrapper: VueWrapper;
function setup(writable = true, sessionItems = items) {
  wrapper = mount(PeakSession, {
    props: {
      items: sessionItems,
      scores: [],
      assessmentId: 'assessment',
      studentName: '测试学生',
      writable,
    },
    global: {
      stubs: {
        VBtn: button,
        VDialog: dialog,
        VIcon: true,
        VChip: true,
        VProgressLinear: true,
        VProgressCircular: true,
        VAlert: { template: '<div><slot/></div>' },
        VTextarea: true,
        VCard: { template: '<div><slot/></div>' },
        VCardText: { template: '<div><slot/></div>' },
        VCardActions: { template: '<div><slot/></div>' },
        VSpacer: true,
        VTabs: true,
        VTab: true,
      },
    },
  });
}
function btn(text: string) {
  const match = wrapper.findAll('button').find((b) => b.text() === text);
  if (!match) throw new Error(`Missing button: ${text}`);
  return match;
}
afterEach(() => {
  wrapper?.unmount();
  vi.clearAllMocks();
  vi.useRealTimers();
});
describe('PEAK guided session', () => {
  it('keeps skip unassessed and switches stimulus pages without recording a score', async () => {
    setup();
    expect(wrapper.get('img').attributes('src')).toBe('/peak/D-7.png');
    await wrapper.get('[aria-label="下一张材料"]').trigger('click');
    expect(wrapper.get('img').attributes('src')).toBe('/peak/D-9.png');
    expect(wrapper.get('.teacher-instruction').text()).toContain('积木去哪里了');
    await btn('暂跳此题').trigger('click');
    expect(wrapper.get('.item-code').text()).toContain('FLS-3');
    expect(request).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toBeUndefined();
  });
  it('retains edits and the current item on save failure, then advances only after success', async () => {
    setup();
    await btn('1 · 正确').trigger('click');
    vi.mocked(request).mockRejectedValueOnce(new Error('保存失败'));
    await btn('保存并下一题').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('保存失败');
    expect(wrapper.get('.item-code').text()).toContain('FLS-2');
    expect(btn('1 · 正确').attributes('aria-pressed')).toBe('true');
    vi.mocked(request).mockResolvedValueOnce({ code: 'FLS-2', score: 1, response: '', notes: '' });
    await btn('保存并下一题').trigger('click');
    await flushPromises();
    expect(request).toHaveBeenLastCalledWith('/assessments/peak/assessment/scores', 'POST', {
      code: 'FLS-2',
      score: 1,
      response: '',
      notes: '',
    });
    expect(wrapper.get('.item-code').text()).toContain('FLS-3');
    expect(wrapper.emitted('saved')).toHaveLength(1);
  });
  it('protects unsaved scores when navigating and hides teacher controls in child view', async () => {
    setup();
    await btn('0 · 未通过').trigger('click');
    await btn('下一题').trigger('click');
    expect(wrapper.text()).toContain('返回保存');
    expect(wrapper.get('.item-code').text()).toContain('FLS-2');
    await btn('返回保存').trigger('click');
    await btn('只看题目').trigger('click');
    expect(wrapper.find('.teacher-panel').exists()).toBe(false);
    expect(wrapper.get('img').attributes('src')).toBe('/peak/D-7.png');
    expect(wrapper.text()).not.toContain('左边的杯子');
    await btn('教师操作').trigger('click');
    expect(btn('0 · 未通过').attributes('aria-pressed')).toBe('true');
  });
  it('finishes the optional timer and does not expose save actions in read-only mode', async () => {
    vi.useFakeTimers();
    setup(false);
    expect(wrapper.text()).not.toContain('保存并下一题');
    await btn('开始计时').trigger('click');
    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.text()).toContain('计时结束');
    expect(request).not.toHaveBeenCalled();
  });
});

describe('full assessment clicking', () => {
  it('returns to skipped items after reaching the end instead of revisiting scored items', async () => {
    const three = (catalog as PeakItem[]).filter((i) => i.module === 'D').slice(0, 3);
    setup(true, three);
    vi.mocked(request).mockImplementation(async (_path, _method, body) => body);
    await btn('暂跳此题').trigger('click');
    await btn('1 · 正确').trigger('click');
    await btn('保存并下一题').trigger('click');
    await flushPromises();
    await wrapper.setProps({
      scores: [{ code: three[1].code, score: 1, response: '', notes: '' }],
    });
    await btn('0 · 未通过').trigger('click');
    await btn('保存本题').trigger('click');
    await flushPromises();
    expect(wrapper.get('.item-code').text()).toContain(three[0].code);
  });
  it('lets multi-page tasks pause and resume on the same material', async () => {
    setup();
    await wrapper.get('[aria-label="下一张材料"]').trigger('click');
    await btn('休息一下').trigger('click');
    expect(wrapper.find('img').exists()).toBe(false);
    await btn('继续').trigger('click');
    expect(wrapper.get('img').attributes('src')).toBe('/peak/D-9.png');
  });
  it.each(['D', 'G'])(
    'clicks all 64 %s tasks and offers a clear path back to the summary',
    async (module) => {
      const full = (catalog as PeakItem[]).filter((i) => i.module === module);
      setup(true, full);
      vi.mocked(request).mockImplementation(async (_path, _method, body) => body);
      const saved = [];
      for (let n = 0; n < full.length; n++) {
        expect(wrapper.get('.item-code').text()).toContain(full[n].code);
        await btn(n % 2 ? '0 · 未通过' : '1 · 正确').trigger('click');
        await btn(n === full.length - 1 ? '保存本题' : '保存并下一题').trigger('click');
        await flushPromises();
        saved.push({ code: full[n].code, score: n % 2 ? 0 : 1, response: '', notes: '' });
        await wrapper.setProps({ scores: [...saved] });
      }
      expect(request).toHaveBeenCalledTimes(64);
      expect(wrapper.text()).toContain('全部项目已记录');
      await btn('返回汇总并核对').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    },
  );
});

it('protects unsaved scoring when the browser leaves the assessment route', async () => {
  setup();
  await btn('1 · 正确').trigger('click');
  const cancelled = routeGuard.callback!();
  await flushPromises();
  await btn('返回保存').trigger('click');
  expect(await cancelled).toBe(false);
  expect(btn('1 · 正确').attributes('aria-pressed')).toBe('true');
  const accepted = routeGuard.callback!();
  await flushPromises();
  await btn('放弃修改并继续').trigger('click');
  expect(await accepted).toBe(true);
});
