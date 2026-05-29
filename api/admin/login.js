// Login do admin do blog.
// Recebe { password } e retorna { token } se a senha bater com ADMIN_PASSWORD.
import { kv } from '@vercel/kv';
import { randomBytes } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'JSON inválido.' });
  }

  const password = (body.password || '').toString();
  if (!password) return res.status(400).json({ error: 'Senha obrigatória.' });

  const ADMIN_PASS = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASS) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada nas variáveis de ambiente.' });
  }

  if (password !== ADMIN_PASS) {
    // Tempo de resposta consistente pra dificultar timing attacks
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  // Sessão válida por 7 dias
  const token = randomBytes(32).toString('hex');
  try {
    await kv.set(`auth:session:${token}`, { createdAt: Date.now() }, { ex: 60 * 60 * 24 * 7 });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao criar sessão: ' + (e.message || 'KV indisponível') });
  }

  return res.status(200).json({ token, expiresIn: 60 * 60 * 24 * 7 });
}
