// Upload de fotos e videos do portfolio, direto do browser pro Vercel Blob.
// Mesmo desenho do onboarding-upload (handleUpload), com uma diferenca: so
// gera token de upload pra quem esta logado no admin. O token de sessao vem
// dentro do clientPayload, porque o upload() do @vercel/blob/client nao manda
// o header Authorization.
//
// Aceita ate 200MB por arquivo (video de portfolio chega a 70MB).

// Forca inclusao do pacote no bundle do Vercel (nft nao rastreia o subpath)
import '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { kv } from '@vercel/kv';

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const MAX_SIZE = 200 * 1024 * 1024; // 200MB

async function sessaoValida(clientPayload) {
  let token = '';
  try {
    token = (JSON.parse(clientPayload || '{}').token || '').toString().trim();
  } catch (e) {
    token = '';
  }
  if (!token) return false;
  try {
    return !!(await kv.get(`auth:session:${token}`));
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await sessaoValida(clientPayload))) {
          throw new Error('Não autenticado. Entra de novo no admin.');
        }
        if (!pathname.startsWith('portfolio/')) {
          throw new Error('Caminho inválido.');
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // O item entra no portfolio quando o admin chama POST /api/portfolio
        // com a URL devolvida. Nada a fazer aqui.
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: (error && error.message) || 'Erro no upload.' });
  }
}
