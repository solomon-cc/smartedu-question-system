import { ref } from 'vue';
import { messageOf } from './types';
export function useTask() {
  const loading = ref(false),
    error = ref(''),
    success = ref('');
  let pendingRefresh: (() => Promise<void>) | undefined;
  async function run(fn: () => Promise<void>, message = '') {
    if (loading.value) return false;
    loading.value = true;
    error.value = '';
    try {
      await fn();
      if (message) success.value = message;
      return true;
    } catch (e) {
      error.value = messageOf(e);
      return false;
    } finally {
      loading.value = false;
      if (pendingRefresh) {
        const next = pendingRefresh;
        pendingRefresh = undefined;
        await run(next);
      }
    }
  }
  // Keep the newest filter/page request instead of silently dropping it while busy.
  async function refresh(fn: () => Promise<void>) {
    if (loading.value) {
      pendingRefresh = fn;
      return false;
    }
    return run(fn);
  }
  return { loading, error, success, run, refresh };
}
