// Upload de imagem para Vercel Blob. Recebe arquivo via stream e devolve URL pública.
import { put } from '@vercel/blob';
import { isAuthed } from '../_lib/auth.js';

export const config = {
  api: { bodyParser: false },
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!(await isAuthed(req))) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  const filename = (req.headers['x-filename'] || 'imagem.png').toString();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  try {
    const buffer = await readBody(req);
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Arquivo vazio.' });
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Arquivo grande demais (limite 5MB).' });
    }

    const blob = await put(`blog/${safeName}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: req.headers['content-type'] || 'application/octet-stream',
    });

    return res.status(200).json({ url: blob.url });
  } catch (e) {
    return res.status(500).json({ error: 'Erro no upload: ' + (e.message || '') });
  }
}
