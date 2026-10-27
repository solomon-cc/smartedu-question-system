import { it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import RewardGame from './RewardGame.vue';
const make = (game: string) =>
  mount(RewardGame, {
    props: { game },
    global: {
      stubs: {
        'a-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot/></button>',
        },
      },
    },
  });
afterEach(() => vi.useRealTimers());
it('finishes each short activity and can return to practice', async () => {
  vi.useFakeTimers();
  for (const game of ['breath', 'math', 'clicker', 'memory', 'reaction', 'simon']) {
    const w = make(game);
    if (game === 'breath') await w.get('button').trigger('click');
    if (game === 'math') {
      await w.get('.game-tiles button').trigger('click');
      expect(w.text()).toContain('再想一想');
      await w.findAll('.game-tiles button')[1]!.trigger('click');
    }
    if (game === 'clicker')
      for (const b of w.findAll('.game-tiles button')) await b.trigger('click');
    if (game === 'memory')
      for (const i of [0, 3, 1, 2]) await w.findAll('.game-tiles button')[i]!.trigger('click');
    if (game === 'reaction') {
      await w.get('button').trigger('click');
      expect(w.get('button').attributes('disabled')).toBeDefined();
      await vi.advanceTimersByTimeAsync(1200);
      await w.get('button').trigger('click');
    }
    if (game === 'simon') {
      await w.get('button').trigger('click');
      await vi.advanceTimersByTimeAsync(2600);
      for (const i of [0, 2, 1]) await w.findAll('.game-tiles button')[i]!.trigger('click');
    }
    expect(w.text()).toContain('已完成');
    await w.findAll('button').at(-1)!.trigger('click');
    expect(w.emitted('close')).toHaveLength(1);
    w.unmount();
  }
});
