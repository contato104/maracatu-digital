// Vercel Serverless Function
// Recebe os dados do briefing e envia por email para todo o time via Resend.
//
// Variáveis de ambiente necessárias (configurar no painel da Vercel):
//   RESEND_API_KEY  = chave da API Resend (obrigatório)
//   RESEND_FROM     = remetente (opcional). Ex: "Maracatu Briefings <briefings@maracatumktdigital.com>"
//                     Se não definir, usa o domínio de testes da Resend.

const TO_EMAILS = [
  'laura@maracatumktdigital.com',
  'marketing@maracatumktdigital.com',
  'marketing2@maracatumktdigital.com',
  'midias@maracatumktdigital.com',
  'diogo@maracatumktdigital.com',
  'contato@maracatumktdigital.com',
  'joana@maracatumktdigital.com',
];

export default async function handler(req, res) {
  // CORS / método
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) {
    return res.status(500).json({
      error: 'RESEND_API_KEY não configurada. Defina nas variáveis de ambiente da Vercel.',
    });
  }

  const FROM = process.env.RESEND_FROM || 'Maracatu Briefings <onboarding@resend.dev>';

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'JSON inválido.' });
  }

  const empresa = (body.empresa || 'Sem nome').toString().slice(0, 200);
  const html = body.html || '<p>Briefing recebido (sem HTML).</p>';
  const text = body.text || '';
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  // Sanitiza anexos (limita tamanho total a ~5MB de base64 ≈ 3.75MB raw)
  const MAX_TOTAL = 5 * 1024 * 1024;
  let totalSize = 0;
  const cleanAttachments = [];
  for (const a of attachments) {
    if (!a || !a.filename || !a.content) continue;
    totalSize += a.content.length;
    if (totalSize > MAX_TOTAL) break;
    cleanAttachments.push({
      filename: String(a.filename).slice(0, 200),
      content: String(a.content),
    });
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: TO_EMAILS,
        subject: `📋 Novo briefing: ${empresa}`,
        html,
        text,
        attachments: cleanAttachments,
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg = (data && (data.message || data.name)) || `HTTP ${resp.status}`;
      return res.status(500).json({ error: 'Resend: ' + msg });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro ao enviar.' });
  }
}
