// Baixa videos do Wix em 720p e sobe pro Vercel Blob.
// Uso: node scripts/upload-portfolio-videos.mjs
import { put } from '@vercel/blob';
import fs from 'node:fs';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN nao definido');
  process.exit(1);
}

// Le hashes do arquivo
const kvRaw = JSON.parse(fs.readFileSync('/tmp/kv-result.json', 'utf-8'));
let urls = JSON.parse(kvRaw.result);
if (typeof urls === 'string') urls = JSON.parse(urls);

const hashes = [];
for (const u of urls) {
  if (u.aba !== 'audiovisual') continue;
  const m = u.url?.match(/b8c5b7_([a-f0-9]{32})f003\.jpg/);
  if (m) hashes.push(m[1]);
}
console.log(`Total: ${hashes.length} videos`);

const uploaded = {};
for (let i = 0; i < hashes.length; i++) {
  const h = hashes[i];
  const wixUrl = `https://video.wixstatic.com/video/b8c5b7_${h}/720p/mp4/file.mp4`;
  process.stdout.write(`[${i+1}/${hashes.length}] ${h.slice(0,16)} `);
  try {
    const resp = await fetch(wixUrl);
    if (!resp.ok) { console.log(`falha download HTTP ${resp.status}`); continue; }
    const buf = Buffer.from(await resp.arrayBuffer());
    const sizeMB = (buf.length / 1024 / 1024).toFixed(1);
    const blob = await put(`portfolio-videos/${h.slice(0,16)}.mp4`, buf, {
      access: 'public',
      token: TOKEN,
      contentType: 'video/mp4',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    uploaded[h] = blob.url;
    console.log(`OK ${sizeMB}MB`);
  } catch (e) {
    console.log(`ERRO: ${e.message}`);
  }
}

fs.writeFileSync('/tmp/blob-videos.json', JSON.stringify(uploaded, null, 2));
console.log(`\nTotal enviado: ${Object.keys(uploaded).length}/${hashes.length}`);
console.log('Salvo em /tmp/blob-videos.json');
