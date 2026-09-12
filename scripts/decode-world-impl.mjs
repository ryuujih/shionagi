import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const upload = join(root, '_upload');
const out = join(root, 'src', 'world-impl.generated.ts');

const patchChunks = readdirSync(upload)
  .filter((n) => /^controls\.patch\.gz\.b64\.p\d+$/.test(n))
  .sort();
if (!patchChunks.length) {
  console.error('missing _upload/controls.patch.gz.b64.pNN');
  process.exit(1);
}
const b64 = patchChunks.map((n) => readFileSync(join(upload, n), 'utf8').trim()).join('');
const patchText = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
const work = join(tmpdir(), `shionagi-wi-${process.pid}`);
mkdirSync(work, { recursive: true });
const basePath = join(work, 'world-impl.base.ts');
const patchPath = join(work, 'controls.patch');
const outPath = join(work, 'world-impl.generated.ts');
const baseText = execFileSync(
  'curl',
  ['-fsSL', 'https://raw.githubusercontent.com/ryuujih/shionagi/main/src/world-impl.ts'],
  { encoding: 'utf8', maxBuffer: 5_000_000 },
);
writeFileSync(basePath, baseText);
writeFileSync(patchPath, patchText);
execFileSync('patch', ['-o', outPath, basePath, patchPath], { stdio: 'inherit' });
const text = readFileSync(outPath, 'utf8');
writeFileSync(out, text);
console.log('patched', out, text.length, 'bytes from', patchChunks.length, 'chunks');
