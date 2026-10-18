import { describe, expect, it, vi } from 'vitest';
import { useTask } from './useData';

describe('filter refresh scheduling', () => {
  it('runs only the newest queued refresh after an in-flight request', async () => {
    const task = useTask();
    let finish!: () => void;
    const first = task.refresh(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const outdated = vi.fn(async () => {});
    const latest = vi.fn(async () => {});
    await task.refresh(outdated);
    await task.refresh(latest);
    finish();
    await first;
    expect(outdated).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
    expect(task.loading.value).toBe(false);
  });
});
