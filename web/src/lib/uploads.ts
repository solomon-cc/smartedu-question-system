import { api, base, token } from './api';
export interface Upload {
  id: string;
  name: string;
  size: number;
  received: number;
  complete: boolean;
}
export function validateUploadFile(file: File, kind?: string) {
  if (!file.size || file.size > 2 * 1024 * 1024 * 1024)
    throw new Error('请选择大于 0 且不超过 2GB 的文件');
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const videos = ['.mp4', '.webm', '.mov'];
  const documents = ['.pdf', '.docx', '.pptx', '.txt'];
  const allowed =
    kind === 'video' ? videos : kind === 'document' ? documents : [...videos, ...documents];
  if (!allowed.includes(extension))
    throw new Error(
      kind === 'video'
        ? '请选择 MP4、WebM 或 MOV 视频'
        : kind === 'document'
          ? '请选择 PDF、DOCX、PPTX 或 TXT 文档'
          : '请选择支持的视频或文档格式',
    );
  if (new TextEncoder().encode(file.name).length > 240)
    throw new Error('文件名过长，请缩短后重新选择');
}
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
export async function digest(blob: Blob) {
  return hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
}
export async function uploadFile(
  file: File,
  signal: AbortSignal,
  onProgress: (value: number) => void,
): Promise<Upload> {
  signal.throwIfAborted();
  validateUploadFile(file);
  const first = await digest(file.slice(0, 65536)),
    last = await digest(file.slice(-65536));
  signal.throwIfAborted();
  const fingerprint = await digest(
    new Blob([`${file.name}|${file.size}|${file.lastModified}|${first}|${last}`]),
  );
  signal.throwIfAborted();
  let { upload, chunkSize } = await api<{ upload: Upload; chunkSize: number }>(
    '/portal/uploads',
    'POST',
    { name: file.name, size: file.size, fingerprint },
  );
  signal.throwIfAborted();
  const valid = (value: Upload) =>
    value &&
    value.id &&
    value.size === file.size &&
    Number.isInteger(value.received) &&
    value.received >= 0 &&
    value.received <= file.size &&
    (!value.complete || value.received === file.size);
  if (!valid(upload) || !Number.isInteger(chunkSize) || chunkSize <= 0)
    throw new Error('上传进度无效，请重新选择原文件恢复任务');
  onProgress(Math.round((upload.received / file.size) * 100));
  while (upload.received < file.size) {
    signal.throwIfAborted();
    const offset = upload.received,
      blob = file.slice(offset, offset + chunkSize),
      sha = await digest(blob);
    signal.throwIfAborted();
    const chunkController = new AbortController();
    const abort = () => chunkController.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 120000);
    let response: Response;
    try {
      response = await fetch(`${base}/portal/uploads/${upload.id}?offset=${offset}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.get()}`,
          'Content-Type': 'application/octet-stream',
          'X-Chunk-SHA256': sha,
        },
        body: blob,
        signal: chunkController.signal,
      });
    } catch {
      signal.throwIfAborted();
      throw new Error('上传连接中断，请检查网络后重试');
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
    signal.throwIfAborted();
    if (response.status === 401) {
      token.clear();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'));
      throw new Error('登录已过期，请重新登录');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.code !== 0)
      throw new Error(data?.err || '上传中断，请重新选择同一文件继续');
    if (!valid(data.data) || data.data.id !== upload.id || data.data.received <= offset)
      throw new Error('上传进度未确认，请重新选择原文件恢复任务');
    upload = data.data;
    onProgress(Math.round((upload.received / file.size) * 100));
  }
  signal.throwIfAborted();
  if (!upload.complete) upload = await api<Upload>(`/portal/uploads/${upload.id}/complete`, 'POST');
  signal.throwIfAborted();
  if (!valid(upload) || !upload.complete) throw new Error('文件尚未保存，请重新选择原文件恢复任务');
  return upload;
}
