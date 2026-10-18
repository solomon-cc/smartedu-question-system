import { cp, mkdir } from 'node:fs/promises';
const output = new URL('../dist-company/', import.meta.url);
await mkdir(output, { recursive: true });
for (const entry of ['team', 'favicon.svg'])
  await cp(new URL('../public/' + entry, import.meta.url), new URL(entry, output), {
    recursive: true,
  });
