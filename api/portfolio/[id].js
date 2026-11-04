// Um item do portfolio.
//   PUT    /api/portfolio/:id  -> atualiza poster/ordem (admin)
//   DELETE /api/portfolio/:id  -> remove do portfolio (admin)
//
// Apagar aqui tira o item da pagina. O arquivo continua no Blob, de proposito:
// se a Laura apagar por engano, da pra readicionar sem subir de novo.
import { kv } from '@vercel/kv';
import { isAuthed } from '../_lib/auth.js';

const KEY = 'portfolio:items';

export default async function handler(req, res) {
  const id = (req.query.id || '').toString();
  if (!id) return res.status(400).json({ error: 'Id obrigatório.' });

  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!(await isAuthed(req))) return res.status(401).json({ error: 'Não autenticado.' });

  let items;
  try {
    items = (await kv.get(KEY)) || [];
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao ler portfolio: ' + (e.message || '') });
  }
  const idx = items.findIndex(it => it.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Item não encontrado.' });

  if (req.method === 'DELETE') {
    items.splice(idx, 1);
    items.forEach((it, i) => { it.ordem = i; });
    try {
      await kv.set(KEY, items);
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao apagar: ' + (e.message || '') });
    }
    // Lista inteira na resposta: leitura logo apos a escrita pode vir atrasada da replica do KV
    return res.status(200).json({ success: true, items });
  }

  // PUT
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'JSON inválido.' });
  }
  const current = items[idx];
  if (body.poster !== undefined) current.poster = (body.poster || '').toString();
  // "topo": manda o item pro inicio da lista
  if (body.topo === true) {
    items.splice(idx, 1);
    items.unshift(current);
  }
  items.forEach((it, i) => { it.ordem = i; });
  try {
    await kv.set(KEY, items);
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao salvar: ' + (e.message || '') });
  }
  return res.status(200).json({ item: current, items });
}
