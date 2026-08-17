import { mkdir, copyFile, writeFile } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const vercelStaticOutput = new URL('../.vercel/output/static/', import.meta.url);
const vercelConfig = new URL('../.vercel/output/config.json', import.meta.url);
const source = new URL('../public/', import.meta.url);
const files = ['index.html', 'styles.css', 'app.mjs', 'archive.mjs', 'core.mjs', 'demo.mjs'];

await mkdir(output, { recursive: true });
await mkdir(vercelStaticOutput, { recursive: true });

await Promise.all(files.flatMap(file => [
  copyFile(new URL(file, source), new URL(file, output)),
  copyFile(new URL(file, source), new URL(file, vercelStaticOutput))
]));

// Explicit Build Output API output prevents Vercel from detecting browser
// modules as serverless functions. This app has no server runtime.
await writeFile(vercelConfig, JSON.stringify({ version: 3 }, null, 2));
