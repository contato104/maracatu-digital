// API do portfolio.
//   GET  /api/portfolio   -> lista os itens na ordem de exibicao (publico)
//   POST /api/portfolio   -> adiciona um item no topo (admin)
//
// Cada item: { id, tipo: 'img' | 'video', src, poster, ordem, criadoEm }
// Os arquivos ficam no Vercel Blob (ou em /portfolio-assets, no caso dos antigos).
import { kv } from '@vercel/kv';
import { isAuthed } from '../_lib/auth.js';

const KEY = 'portfolio:items';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const items = (await kv.get(KEY)) || [];
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
      return res.status(200).json({ items });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao buscar portfolio: ' + (e.message || '') });
    }
  }

  if (req.method === 'POST') {
    if (!(await isAuthed(req))) return res.status(401).json({ error: 'Não autenticado.' });

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
      return res.status(400).json({ error: 'JSON inválido.' });
    }

    const tipo = body.tipo === 'video' ? 'video' : 'img';
    const src = (body.src || '').toString().trim();
    const poster = (body.poster || '').toString().trim();
    if (!src) return res.status(400).json({ error: 'Arquivo obrigatório.' });
    if (!/^(https?:\/\/|\/)/.test(src)) return res.status(400).json({ error: 'Endereço do arquivo inválido.' });

    try {
      const items = (await kv.get(KEY)) || [];
      const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        tipo,
        src,
        poster,
        criadoEm: new Date().toISOString(),
      };
      items.unshift(item);
      items.forEach((it, i) => { it.ordem = i; });
      await kv.set(KEY, items);
      return res.status(201).json({ item });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao salvar: ' + (e.message || '') });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Método não permitido.' });
}
