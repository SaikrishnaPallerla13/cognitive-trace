import { mkdir, copyFile, rm } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const files = ['index.html', 'styles.css', 'app.mjs', 'archive.mjs', 'core.mjs', 'demo.mjs'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map(file => copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output))));
