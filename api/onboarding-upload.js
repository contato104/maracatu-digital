// Endpoint publico para upload de arquivos do briefing de onboarding.
// Usa handleUpload do @vercel/blob/client para permitir upload direto do browser,
// contornando o limite de 4.5MB do body de funcoes serverless.
//
// Aceita arquivos ate 100MB (logo, manual de marca, fotos, videos curtos).
//
// Esse endpoint atende duas chamadas:
//   1. Cliente pede token: { type: 'blob.generate-client-token', payload: {...} }
//   2. Vercel notifica conclusao: { type: 'blob.upload-completed', payload: {...} }

// Forca inclusao do pacote no bundle do Vercel (nft as vezes nao rastreia subpaths)
import '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

const ALLOWED_TYPES = [
  // Imagens
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/vnd.adobe.photoshop', // .psd
  // Documentos
  'application/pdf',
  // Adobe Illustrator / Encapsulated PostScript
  'application/postscript',
  'application/illustrator',
  'application/eps',
  // Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Arquivos compactados
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // Video / audio curtos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  // Fallback (alguns browsers nao detectam mime)
  'application/octet-stream',
];

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname /* , clientPayload */) => {
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async (/* { blob, tokenPayload } */) => {
        // Hook opcional: poderiamos salvar metadata em KV aqui se quisermos
        // ter uma lista centralizada de uploads. Por ora, nao precisamos.
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({
      error: (error && error.message) || 'Erro no upload.',
    });
  }
}
