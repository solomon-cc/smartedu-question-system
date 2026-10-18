// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { File } from 'node:buffer';
import { api } from './api';
import { uploadFile } from './uploads';
vi.mock('./api', () => ({ api: vi.fn(), base: '/api', token: { get: () => 'local-test-token' } }));
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
it('pauses without throwing away the durable server task', async () => {
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
  expect(api).toHaveBeenCalledTimes(1);
});
