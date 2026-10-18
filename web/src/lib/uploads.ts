import { api, base, token } from './api';
export interface Upload {
  id: string;
  name: string;
  size: number;
  received: number;
  complete: boolean;
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
  const first = await digest(file.slice(0, 65536)),
    last = await digest(file.slice(-65536));
  const fingerprint = await digest(
    new Blob([`${file.name}|${file.size}|${file.lastModified}|${first}|${last}`]),
  );
  let { upload, chunkSize } = await api<{ upload: Upload; chunkSize: number }>(
    '/portal/uploads',
    'POST',
    { name: file.name, size: file.size, fingerprint },
  );
  onProgress(Math.round((upload.received / file.size) * 100));
  while (upload.received < file.size) {
    signal.throwIfAborted();
    const offset = upload.received,
      blob = file.slice(offset, offset + chunkSize),
      sha = await digest(blob);
    const response = await fetch(`${base}/portal/uploads/${upload.id}?offset=${offset}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.get()}`,
        'Content-Type': 'application/octet-stream',
        'X-Chunk-SHA256': sha,
      },
      body: blob,
      signal,
    });
    const data = await response.json();
    if (!response.ok || data.code !== 0)
      throw new Error(data.err || '上传中断，请重新选择同一文件继续');
    upload = data.data;
    onProgress(Math.round((upload.received / file.size) * 100));
  }
  signal.throwIfAborted();
  if (!upload.complete) upload = await api<Upload>(`/portal/uploads/${upload.id}/complete`, 'POST');
  return upload;
}
