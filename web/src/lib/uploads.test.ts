// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { File } from 'node:buffer';
import { api } from './api';
import { uploadFile, validateUploadFile } from './uploads';
vi.mock('./api', () => ({
  api: vi.fn(),
  base: '/api',
  token: { get: () => 'local-test-token', clear: vi.fn() },
}));
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.mocked(api).mockReset();
});
it('resumes at the server-confirmed offset and verifies only remaining chunks', async () => {
  const f = new File(['0123456789abcdef'], 'test.txt', { lastModified: 100 });
  const progress: number[] = [];
  vi.mocked(api)
    .mockResolvedValueOnce({
      upload: { id: 'existing', name: f.name, size: 16, received: 8, complete: false },
      chunkSize: 4,
    })
    .mockResolvedValueOnce({ id: 'existing', size: 16, received: 16, complete: true });
  let offset = 8;
  const bodies: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain('offset=' + offset);
      const blob = init.body as Blob;
      bodies.push(await blob.text());
      expect((init.headers as Record<string, string>)['X-Chunk-SHA256']).toHaveLength(64);
      offset += blob.size;
      return new Response(
        JSON.stringify({
          code: 0,
          data: { id: 'existing', size: 16, received: offset, complete: false },
        }),
        { status: 200 },
      );
    }),
  );
  const result = await uploadFile(
    f as unknown as globalThis.File,
    new AbortController().signal,
    (p) => progress.push(p),
  );
  expect(bodies).toEqual(['89ab', 'cdef']);
  expect(progress).toEqual([50, 75, 100]);
  expect(result.complete).toBe(true);
  expect(api).toHaveBeenLastCalledWith('/portal/uploads/existing/complete', 'POST');
});
it('does not transfer a file that the server already has', async () => {
  const f = new File(['already saved'], 'test.txt', { lastModified: 100 });
  vi.mocked(api).mockResolvedValueOnce({
    upload: { id: 'complete', size: f.size, received: f.size, complete: true },
    chunkSize: 4,
  });
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const result = await uploadFile(
    f as unknown as globalThis.File,
    new AbortController().signal,
    () => {},
  );
  expect(result.id).toBe('complete');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('does not initialize a new upload after pause was requested', async () => {
  const f = new File(['test file'], 'test.txt', { lastModified: 100 });
  const controller = new AbortController();
  controller.abort();
  vi.mocked(api).mockResolvedValueOnce({
    upload: { id: 'paused', size: f.size, received: 4, complete: false },
    chunkSize: 4,
  });
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    uploadFile(f as unknown as globalThis.File, controller.signal, () => {}),
  ).rejects.toBeDefined();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(api).not.toHaveBeenCalled();
});
it('does not publish an attachment when paused during finalization', async () => {
  const f = new File(['file'], 'test.txt', { lastModified: 100 });
  const controller = new AbortController();
  vi.mocked(api)
    .mockResolvedValueOnce({
      upload: { id: 'finishing', size: f.size, received: f.size, complete: false },
      chunkSize: 4,
    })
    .mockImplementationOnce(async () => {
      controller.abort();
      return { id: 'finishing', size: f.size, received: f.size, complete: true };
    });
  await expect(
    uploadFile(f as unknown as globalThis.File, controller.signal, () => {}),
  ).rejects.toBeDefined();
  expect(api).toHaveBeenLastCalledWith('/portal/uploads/finishing/complete', 'POST');
});
it('fails recoverably when a chunk response is not JSON', async () => {
  const f = new File(['file'], 'test.txt');
  vi.mocked(api).mockResolvedValueOnce({
    upload: { id: 'upload', size: f.size, received: 0, complete: false },
    chunkSize: 4,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 })),
  );
  await expect(
    uploadFile(f as unknown as globalThis.File, new AbortController().signal, () => {}),
  ).rejects.toThrow('重新选择同一文件继续');
  expect(api).toHaveBeenCalledTimes(1);
});
it('rejects unconfirmed chunk offsets instead of looping forever', async () => {
  const f = new File(['file'], 'test.txt');
  const upload = { id: 'upload', size: f.size, received: 0, complete: false };
  vi.mocked(api).mockResolvedValueOnce({ upload, chunkSize: 4 });
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: upload })));
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    uploadFile(f as unknown as globalThis.File, new AbortController().signal, () => {}),
  ).rejects.toThrow('进度未确认');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('validates file size and lesson format before uploading', () => {
  expect(() => validateUploadFile(new File([], 'empty.txt') as unknown as globalThis.File)).toThrow(
    '大于 0',
  );
  expect(() =>
    validateUploadFile(new File(['x'], 'wrong.pdf') as unknown as globalThis.File, 'video'),
  ).toThrow('MP4');
  expect(() =>
    validateUploadFile(new File(['x'], 'wrong.mp4') as unknown as globalThis.File, 'document'),
  ).toThrow();
  expect(() =>
    validateUploadFile(new File(['x'], 'valid.MP4') as unknown as globalThis.File, 'video'),
  ).not.toThrow();
});
