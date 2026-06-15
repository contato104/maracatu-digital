// API pública/admin de posts.
//   GET  /api/posts        -> lista todos os posts (público)
//   POST /api/posts        -> cria um post novo (precisa de token)
import { kv } from '@vercel/kv';
import { isAuthed } from '../_lib/auth.js';

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const posts = (await kv.get('blog:posts')) || [];
      return res.status(200).json({ posts });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao buscar posts: ' + (e.message || '') });
    }
  }

  if (req.method === 'POST') {
    if (!(await isAuthed(req))) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
      return res.status(400).json({ error: 'JSON inválido.' });
    }

    const title = (body.title || '').toString().trim();
    const content = (body.content || '').toString();
    if (!title) return res.status(400).json({ error: 'Título obrigatório.' });
    if (!content) return res.status(400).json({ error: 'Conteúdo obrigatório.' });

    try {
      const posts = (await kv.get('blog:posts')) || [];

      // Slug único
      let baseSlug = slugify(title);
      let slug = baseSlug;
      let counter = 1;
      while (posts.some(p => p.slug === slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const now = new Date().toISOString();
      // publishedAt customizado opcional — usado pra publicar posts com data passada
      // ou agendar pra datas futuras (visivel ao publico imediatamente, mas com
      // a data exibida sendo a definida).
      let publishedAt = now;
      if (body.publishedAt) {
        const candidate = new Date(body.publishedAt);
        if (!isNaN(candidate.getTime())) {
          publishedAt = candidate.toISOString();
        }
      }
      const post = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        slug,
        title,
        excerpt: (body.excerpt || '').toString(),
        content,
        category: (body.category || 'Estratégia').toString(),
        coverImage: (body.coverImage || '').toString(),
        author: (body.author || 'Maracatu Digital').toString(),
        publishedAt,
        updatedAt: now,
      };

      posts.unshift(post);
      await kv.set('blog:posts', posts);
      return res.status(201).json({ post });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao salvar: ' + (e.message || '') });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Método não permitido.' });
}
