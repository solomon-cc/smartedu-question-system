import { base, token, ApiError } from './api';

export async function assessmentAsset(file: string, signal?: AbortSignal): Promise<Blob> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 30000);
  try {
    const response = await fetch(base + '/portal/assessment-assets/' + encodeURIComponent(file), {
      headers: { Authorization: 'Bearer ' + (token.get() || '') },
      signal: controller.signal,
    });
    if (response.status === 401) {
      token.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    if (!response.ok)
      throw new ApiError(
        response.status,
        response.status === 401 ? '登录已过期，请重新登录' : '材料加载失败，请重试',
      );
    return await response.blob();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
