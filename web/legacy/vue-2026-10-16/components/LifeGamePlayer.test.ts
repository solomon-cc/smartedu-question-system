import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { request, ApiError } from '../lib/api';
import { auth } from '../stores/auth';
import LifeGamePlayer from './LifeGamePlayer.vue';
import { centsFrom, type GameSession, type GameAction } from '../lib/lifeGames';
vi.mock('../lib/api', async () => {
  const original = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...original, request: vi.fn() };
});
let wrapper: VueWrapper;
const stubs = {
  VBtn: {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled||loading"><slot/></button>',
  },
  VIcon: true,
  VDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot/></div>' },
  VCard: { template: '<div><slot/></div>' },
  VAlert: { template: '<div role="alert"><slot/></div>' },
};
function fixture(mode = 'student'): GameSession {
  return {
    id: 'session',
    scenarioId: 'market',
    scenarioName: '超市',
    studentId: 'child',
    actorId: 'child',
    mode,
    levelId: 'first',
    status: 'ongoing',
    startedAt: '2026-10-09',
    definition: {
      version: '1',
      environment: 'supermarket',
      background: '',
      goals: [],
      transfer: ['在真实超市试试。'],
      levels: [
        {
          id: 'first',
          name: '两件物品',
          goal: '购物',
          budgetCents: 2000,
          targets: [
            { itemId: 'apple', quantity: 1 },
            { itemId: 'milk', quantity: 1 },
          ],
          wallet: [{ cents: 1000, count: 1 }],
          steps: [
            {
              id: 'plan',
              kind: 'ack',
              title: '看清单',
              prompt: '看看要买什么',
              hint: '看图',
              choices: [],
            },
            {
              id: 'shop',
              kind: 'shop',
              title: '选物品',
              prompt: '把清单物品放进篮子',
              hint: '对照清单',
              choices: [],
            },
            {
              id: 'total',
              kind: 'total',
              title: '算总价',
              prompt: '一共多少钱',
              hint: '加起来',
              choices: [],
            },
            {
              id: 'pay',
              kind: 'pay',
              title: '付款',
              prompt: '从钱包取钱',
              hint: '够支付总价',
              choices: [],
            },
            {
              id: 'change',
              kind: 'change',
              title: '找零',
              prompt: '应找回多少',
              hint: '10减8',
              choices: [],
            },
          ],
        },
      ],
    },
    items: [
      { id: 'apple', name: '苹果', price: 3, image: '', art: 'apple' },
      { id: 'milk', name: '牛奶', price: 5, image: '', art: 'milk' },
    ],
    state: { step: 0, cart: {}, money: {}, totalCents: 0, paidCents: 0, finished: false },
    events: [],
  };
}
async function click(text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  expect(button, text).toBeTruthy();
  await button!.trigger('click');
  await flushPromises();
}
async function dragTo(selector: string, zone: string | null) {
  const source = wrapper.get(selector);
  const destination = zone ? wrapper.get('[data-dropzone="' + zone + '"]').element : null;
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(() => destination),
  });
  await source.trigger('pointerdown', {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    button: 0,
    isPrimary: true,
    pointerType: 'touch',
  });
  await source.trigger('pointermove', {
    pointerId: 1,
    clientX: 300,
    clientY: 350,
    pointerType: 'touch',
  });
  expect(document.querySelector('.drag-ghost')).toBeTruthy();
  await source.trigger('pointerup', {
    pointerId: 1,
    clientX: 300,
    clientY: 350,
    pointerType: 'touch',
  });
  await flushPromises();
}
function setup(initial: GameSession) {
  auth.user = { id: 'child', name: '学生', username: 'child', role: 'STUDENT' };
  wrapper = mount(LifeGamePlayer, {
    props: { initial },
    global: { stubs },
    attachTo: document.body,
  });
}
afterEach(() => {
  wrapper?.unmount();
  auth.user = null;
  vi.clearAllMocks();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
describe('life game actual learner controls', () => {
  it('completes shopping, retries wrong total, pays and checks change through scene controls', async () => {
    let server = fixture();
    vi.mocked(request).mockImplementation(async (_path, _method, body) => {
      const a = body as GameAction;
      let advanced = false;
      let correct = true;
      if (a.kind === 'add') server.state.cart[a.itemId!] = (server.state.cart[a.itemId!] || 0) + 1;
      if (a.kind === 'check') {
        advanced = true;
        if (server.state.step === 1) server.state.totalCents = 800;
      }
      if (a.kind === 'answer') {
        correct = a.value === (server.state.step === 2 ? 800 : 200);
        advanced = correct;
      }
      if (a.kind === 'money-add') {
        server.state.money['1000'] = 1;
        server.state.paidCents = 1000;
      }
      if (advanced) {
        server.state.step++;
        if (server.state.step === 5) {
          server.state.finished = true;
          server.status = 'completed';
        }
      }
      return {
        session: JSON.parse(JSON.stringify(server)),
        correct,
        feedback: correct ? '这一步完成了' : '再算一次',
      };
    });
    setup(fixture());
    await flushPromises();
    expect(wrapper.find('.game-track').exists()).toBe(false);
    expect(wrapper.find('.game-action').exists()).toBe(false);
    await dragTo('[aria-label="拖动苹果，3元到购物篮"]', 'basket');
    await dragTo('[aria-label="拖动牛奶，5元到购物篮"]', 'basket');
    await dragTo('[aria-label="将购物篮拖到收银台"]', 'checkout');
    await wrapper.get('[aria-label="打开收银台计算金额"]').trigger('click');
    await flushPromises();
    await click('7');
    await click('告诉收银员');
    expect(wrapper.text()).toContain('再算一次');
    expect(wrapper.find('.game-receipt output').text()).toContain('7');
    await wrapper.get('[aria-label="删除一位"]').trigger('click');
    await click('8');
    await click('告诉收银员');
    await dragTo('[aria-label="拖动10元到收银台"]', 'checkout');
    await wrapper.get('[aria-label="打开收银台计算金额"]').trigger('click');
    await flushPromises();
    await click('2');
    await click('核对找零');
    expect(wrapper.text()).toContain('生活任务完成了！');
    expect(wrapper.text()).toContain('本次总价 ¥8');
    expect(wrapper.emitted('updated')?.length).toBeGreaterThan(5);
  });
  it('retries an uncertain network response with the same request ID', async () => {
    const initial = fixture();
    vi.mocked(request)
      .mockRejectedValueOnce(new ApiError('网络暂不可用', 0))
      .mockResolvedValueOnce({
        session: { ...initial, state: { ...initial.state, step: 1 } },
        feedback: '完成',
        correct: true,
      });
    setup(initial);
    await flushPromises();
    expect(wrapper.text()).toContain('网络暂不可用');
    await click('重试这次操作');
    expect(vi.mocked(request).mock.calls[0][2]).toEqual(vi.mocked(request).mock.calls[1][2]);
    expect(wrapper.text()).toContain('把清单上的物品拖进购物篮');
  });
  it('teacher preview replays actions without creating student records', async () => {
    const initial = fixture('preview');
    vi.mocked(request).mockResolvedValue({
      session: { ...initial, state: { ...initial.state, step: 1 } },
      feedback: '完成',
      correct: true,
    });
    setup(initial);
    await flushPromises();
    expect(request).toHaveBeenCalledWith(
      '/scenarios/market/preview',
      'POST',
      expect.objectContaining({ actions: [expect.objectContaining({ kind: 'check' })] }),
    );
    expect(vi.mocked(request).mock.calls.some((c) => c[0].includes('scenario-sessions'))).toBe(
      false,
    );
  });
  it('student can view but cannot edit a teacher-led session', () => {
    const initial = fixture();
    initial.actorId = 'teacher';
    initial.mode = 'guided';
    setup(initial);
    expect(
      wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '收银台，放入购物篮或钱币')!
        .attributes(),
    ).toHaveProperty('disabled');
    expect(request).not.toHaveBeenCalled();
  });
  it('does not mutate inventory when a drag misses its target or is cancelled', async () => {
    const initial = fixture();
    initial.state.step = 1;
    setup(initial);
    await dragTo('[aria-label="拖动苹果，3元到购物篮"]', null);
    expect(request).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('还没有放入');
    const source = wrapper.get('[aria-label="拖动苹果，3元到购物篮"]');
    await source.trigger('pointerdown', { pointerId: 2, clientX: 100, clientY: 100, button: 0 });
    await source.trigger('pointermove', { pointerId: 2, clientX: 300, clientY: 350 });
    await source.trigger('pointercancel', { pointerId: 2 });
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps a tap-to-move alternative without changing inventory until the destination is selected', async () => {
    const initial = fixture();
    initial.state.step = 1;
    vi.mocked(request).mockResolvedValue({
      session: { ...initial, state: { ...initial.state, cart: { apple: 1 } } },
      feedback: '已放入',
      correct: true,
    });
    setup(initial);
    await wrapper.get('[aria-label="拖动苹果，3元到购物篮"]').trigger('click');
    expect(request).not.toHaveBeenCalled();
    await wrapper.get('[aria-label="将购物篮拖到收银台"]').trigger('click');
    await flushPromises();
    expect(request).toHaveBeenCalledWith(
      '/scenario-sessions/session/actions',
      'POST',
      expect.objectContaining({ kind: 'add', itemId: 'apple' }),
    );
  });
  it('resumes a saved payment that was interrupted before checkout confirmation', async () => {
    const initial = fixture();
    initial.state = { ...initial.state, step: 3, money: { '1000': 1 }, totalCents: 800 };
    vi.mocked(request).mockResolvedValue({
      session: { ...initial, state: { ...initial.state, step: 4, paidCents: 1000 } },
      feedback: '完成',
      correct: true,
    });
    setup(initial);
    await flushPromises();
    expect(request).toHaveBeenCalledWith(
      '/scenario-sessions/session/actions',
      'POST',
      expect.objectContaining({ kind: 'check' }),
    );
    expect(wrapper.find('[aria-label="打开收银台计算金额"]').exists()).toBe(true);
  });
  it('parses yuan and jiao accurately and rejects incomplete decimals', () => {
    expect(centsFrom('9.5')).toBe(950);
    expect(centsFrom('0.05')).toBe(5);
    expect(centsFrom('9.')).toBeNull();
    expect(centsFrom('9.555')).toBeNull();
  });
});
