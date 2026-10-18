import { api, token, ApiError } from './api';
import type { Progress } from './types';
export interface PendingProgress extends Progress {
  queuedAt: number;
}
const key = (uid: string) => `smartedu.training.progress.${uid}`;
let version = 0;
export function pendingProgress(uid: string): Record<string, PendingProgress> {
  try {
    return JSON.parse(localStorage.getItem(key(uid)) || '{}');
  } catch {
    return {};
  }
}
export function queueProgress(uid: string, p: Progress) {
  const all = pendingProgress(uid),
    prior = all[p.lessonId];
  all[p.lessonId] = {
    ...p,
    completed: p.completed || prior?.completed || false,
    queuedAt: Math.max(Date.now(), ++version, (prior?.queuedAt || 0) + 1),
  };
  localStorage.setItem(key(uid), JSON.stringify(all));
  return all[p.lessonId]!;
}
const flushing = new Map<string, Promise<void>>();
export function flushProgress(uid: string): Promise<void> {
  const existing = flushing.get(uid);
  if (existing) return existing;
  const credential = token.get();
  const work = (async () => {
    for (const p of Object.values(pendingProgress(uid))) {
      if (token.get() !== credential) throw new Error('账号已切换，请重新同步进度');
      try {
        await api('/portal/progress/' + p.lessonId, 'PUT', p);
      } catch (e) {
        if (!(e instanceof ApiError) || ![403, 404].includes(e.status)) throw e;
      }
      const all = pendingProgress(uid);
      if (all[p.lessonId]?.queuedAt === p.queuedAt) {
        delete all[p.lessonId];
        localStorage.setItem(key(uid), JSON.stringify(all));
      }
    }
  })().finally(() => flushing.delete(uid));
  flushing.set(uid, work);
  return work;
}
