import { gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64Path = join(root, '_upload', 'world-impl.ts.gz.b64');
if (!existsSync(b64Path)) {
  console.error('missing', b64Path);
  process.exit(1);
}
const out = join(root, 'src', 'world-impl.generated.ts');
const text = gunzipSync(Buffer.from(readFileSync(b64Path, 'utf8'), 'base64')).toString('utf8');
writeFileSync(out, text);
console.log('decoded', out, text.length, 'bytes');
