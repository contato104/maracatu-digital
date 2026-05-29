// API de um post específico por slug.
//   GET    /api/posts/:slug   -> retorna o post (público)
//   PUT    /api/posts/:slug   -> atualiza o post (admin)
//   DELETE /api/posts/:slug   -> apaga o post (admin)
import { kv } from '@vercel/kv';
import { isAuthed } from '../_lib/auth.js';

export default async function handler(req, res) {
  const slug = (req.query.slug || '').toString();
  if (!slug) return res.status(400).json({ error: 'Slug obrigatório.' });

  let posts;
  try {
    posts = (await kv.get('blog:posts')) || [];
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao ler posts: ' + (e.message || '') });
  }

  const idx = posts.findIndex(p => p.slug === slug);

  if (req.method === 'GET') {
    if (idx === -1) return res.status(404).json({ error: 'Post não encontrado.' });
    return res.status(200).json({ post: posts[idx] });
  }

  if (req.method === 'PUT') {
    if (!(await isAuthed(req))) return res.status(401).json({ error: 'Não autenticado.' });
    if (idx === -1) return res.status(404).json({ error: 'Post não encontrado.' });

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
      return res.status(400).json({ error: 'JSON inválido.' });
    }

    const current = posts[idx];
    const updated = {
      ...current,
      title: body.title !== undefined ? body.title : current.title,
      excerpt: body.excerpt !== undefined ? body.excerpt : current.excerpt,
      content: body.content !== undefined ? body.content : current.content,
      category: body.category !== undefined ? body.category : current.category,
      coverImage: body.coverImage !== undefined ? body.coverImage : current.coverImage,
      author: body.author !== undefined ? body.author : current.author,
      updatedAt: new Date().toISOString(),
    };
    posts[idx] = updated;

    try {
      await kv.set('blog:posts', posts);
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao salvar: ' + (e.message || '') });
    }
    return res.status(200).json({ post: updated });
  }

  if (req.method === 'DELETE') {
    if (!(await isAuthed(req))) return res.status(401).json({ error: 'Não autenticado.' });
    if (idx === -1) return res.status(404).json({ error: 'Post não encontrado.' });

    posts.splice(idx, 1);
    try {
      await kv.set('blog:posts', posts);
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao apagar: ' + (e.message || '') });
    }
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Método não permitido.' });
}
