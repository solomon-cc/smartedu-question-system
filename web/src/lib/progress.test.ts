import { beforeEach, describe, it, expect, vi } from 'vitest';
import { queueProgress, pendingProgress, flushProgress } from './progress';
import { api, token, ApiError } from './api';
vi.mock('./api', () => ({
  api: vi.fn(),
  token: { get: vi.fn(() => 'same-account') },
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
beforeEach(() => {
  localStorage.clear();
  vi.mocked(api).mockReset();
  vi.mocked(token.get).mockReturnValue('same-account');
});
describe('durable training progress', () => {
  it('keeps offline progress isolated by user and never rolls completion back', () => {
    queueProgress('parent', { lessonId: 'one', position: 50, completed: true });
    queueProgress('parent', { lessonId: 'one', position: 12, completed: false });
    expect(pendingProgress('parent').one).toMatchObject({ position: 12, completed: true });
    expect(pendingProgress('teacher')).toEqual({});
  });
  it('retains unsynced progress on connection failure and retries later', async () => {
    queueProgress('parent', { lessonId: 'one', position: 50, completed: false });
    vi.mocked(api).mockRejectedValueOnce(new Error('offline'));
    await expect(flushProgress('parent')).rejects.toThrow('offline');
    expect(pendingProgress('parent').one?.position).toBe(50);
    vi.mocked(api).mockResolvedValueOnce({});
    await flushProgress('parent');
    expect(pendingProgress('parent')).toEqual({});
  });
  it('does not erase a newer position queued while an older position is in flight', async () => {
    queueProgress('parent', { lessonId: 'one', position: 12, completed: false });
    let finish!: (v: unknown) => void;
    vi.mocked(api).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const sending = flushProgress('parent');
    queueProgress('parent', { lessonId: 'one', position: 25, completed: false });
    finish({});
    await sending;
    expect(pendingProgress('parent').one?.position).toBe(25);
  });
  it('stops replay after an account switch', async () => {
    queueProgress('parent', { lessonId: 'one', position: 12, completed: false });
    queueProgress('parent', { lessonId: 'two', position: 50, completed: false });
    vi.mocked(api).mockImplementationOnce(async () => {
      vi.mocked(token.get).mockReturnValue('different-account');
      return {};
    });
    await expect(flushProgress('parent')).rejects.toThrow('账号已切换');
    expect(api).toHaveBeenCalledTimes(1);
    expect(pendingProgress('parent').two?.position).toBe(50);
  });
  it('removes inaccessible stale lessons and syncs the next lesson', async () => {
    queueProgress('parent', { lessonId: 'deleted', position: 12, completed: false });
    queueProgress('parent', { lessonId: 'available', position: 30, completed: false });
    vi.mocked(api).mockRejectedValueOnce(new ApiError(403, 'revoked')).mockResolvedValueOnce({});
    await flushProgress('parent');
    expect(pendingProgress('parent')).toEqual({});
    expect(api).toHaveBeenCalledTimes(2);
  });
});
