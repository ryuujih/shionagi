import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const upload = join(root, '_upload');
const out = join(root, 'src', 'world-impl.generated.ts');
const partFiles = readdirSync(upload)
  .filter((n) => /^world-impl\.ts\.part\d+$/.test(n))
  .sort();
if (partFiles.length) {
  const text = partFiles.map((n) => readFileSync(join(upload, n), 'utf8')).join('');
  writeFileSync(out, text);
  console.log('assembled', out, text.length, 'bytes from', partFiles.length, 'parts');
  process.exit(0);
}
const b64Parts = ['world-impl.ts.gz.b64.part0', 'world-impl.ts.gz.b64.part1'];
const b64Single = join(upload, 'world-impl.ts.gz.b64');
let b64 = '';
if (existsSync(join(upload, b64Parts[0])) && existsSync(join(upload, b64Parts[1]))) {
  b64 = readFileSync(join(upload, b64Parts[0]), 'utf8').trim() + readFileSync(join(upload, b64Parts[1]), 'utf8').trim();
} else if (existsSync(b64Single)) {
  b64 = readFileSync(b64Single, 'utf8').trim();
} else {
  console.error('missing world-impl artifact parts');
  process.exit(1);
}
const text = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
writeFileSync(out, text);
console.log('decoded', out, text.length, 'bytes');
