// Public read-only data. This client never restores a session or sends credentials.
export async function companyGet<T>(resource: 'catalog' | 'courses'): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/portal/' + resource, {
      credentials: 'omit',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('连接失败，请检查网络后重试');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.code !== 0)
    throw new Error(payload?.err || '暂时无法加载，请稍后重试');
  return payload.data;
}
