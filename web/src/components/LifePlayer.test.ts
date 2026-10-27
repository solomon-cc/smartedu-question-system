import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LifePlayer from './LifePlayer.vue';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import type { GameSession } from '../lib/lifeGames';
vi.mock('../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../lib/api')>('../lib/api')),
  api: vi.fn(),
}));
vi.mock('./useLeaveGuard', () => ({ useLeaveGuard: () => ({ confirm: async () => true }) }));
const session = (): GameSession => ({
  id: 'saved',
  scenarioId: 'bag',
  scenarioName: '整理书包',
  studentId: 'child',
  actorId: 'child',
  mode: 'student',
  levelId: 'base',
  status: 'ongoing',
  startedAt: '2026-10-18',
  definition: {
    version: 'v1',
    environment: 'schoolbag',
    background: '',
    goals: [],
    transfer: [],
    levels: [
      {
        id: 'base',
        name: '准备物品',
        goal: '',
        budgetCents: 0,
        targets: [{ itemId: 'book', quantity: 1 }],
        wallet: [],
        steps: [
          {
            id: 'pack',
            title: '整理书包',
            prompt: '按清单整理书包',
            hint: '',
            kind: 'pack',
            choices: [],
          },
        ],
      },
    ],
  },
  items: [{ id: 'book', name: '课本', price: 0, image: '', art: 'book' }],
  state: { step: 0, cart: {}, money: {}, totalCents: 0, paidCents: 0, finished: false },
  events: [],
});
const stubs = {
  'a-button': {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled || loading"><slot/></button>',
  },
  'a-alert': { template: '<div><slot/></div>' },
  'a-progress': true,
  ProductArt: true,
};
afterEach(() => {
  vi.clearAllMocks();
  auth.user = null;
});
it('retries an uncertain saved action with the same id and updates only after confirmation', async () => {
  auth.user = { id: 'child', name: 'child', username: 'child', role: 'STUDENT' };
  const confirmed = session();
  confirmed.state.cart = { book: 1 };
  vi.mocked(api)
    .mockRejectedValueOnce(new Error('连接失败'))
    .mockResolvedValueOnce({ session: confirmed, correct: true, feedback: '已放入课本' });
  const wrapper = mount(LifePlayer, { props: { initial: session() }, global: { stubs } });
  await wrapper.get('[aria-label="放入课本"]').trigger('click');
  await flushPromises();
  expect(wrapper.get('output').text()).toBe('0');
  const sent = vi.mocked(api).mock.calls[0]![2];
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '重试本次操作')!
    .trigger('click');
  await flushPromises();
  expect(vi.mocked(api).mock.calls[1]![2]).toEqual(sent);
  expect(wrapper.get('output').text()).toBe('1');
  wrapper.unmount();
});
it('keeps teacher preview actions out of persisted student sessions', async () => {
  auth.user = { id: 'teacher', name: 'teacher', username: 'teacher', role: 'TEACHER' };
  const initial = session();
  initial.mode = 'preview';
  initial.actorId = '';
  vi.mocked(api).mockResolvedValue({ session: initial, correct: true, feedback: '预览' });
  const wrapper = mount(LifePlayer, { props: { initial }, global: { stubs } });
  await wrapper.get('[aria-label="放入课本"]').trigger('click');
  await flushPromises();
  expect(api).toHaveBeenCalledWith(
    '/scenarios/bag/preview',
    'POST',
    expect.objectContaining({
      levelId: 'base',
      actions: [expect.objectContaining({ kind: 'add', itemId: 'book' })],
    }),
  );
  expect(vi.mocked(api).mock.calls.some(([path]) => path.startsWith('/scenario-sessions'))).toBe(
    false,
  );
  wrapper.unmount();
});
