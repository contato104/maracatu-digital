// Utilitário compartilhado: valida o token de sessão presente no header Authorization.
import { kv } from '@vercel/kv';

export async function isAuthed(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  try {
    const session = await kv.get(`auth:session:${token}`);
    return !!session;
  } catch (e) {
    return false;
  }
}
