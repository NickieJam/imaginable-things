import { issueSignedToken, presignUrl } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'pdf', 'svg', 'ai', 'eps',
  'dst', 'emb', 'pes', 'exp', 'jef', 'vp3', 'hus', 'xxx',
]);

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function safeFilename(name) {
  const base = String(name || 'design-file')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(-120);
  return base || 'design-file';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!sameOrigin(req)) {
    return res.status(403).json({ error: 'Upload request rejected.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const fileName = String(body.fileName || '');
    const size = Number(body.size || 0);
    const contentType = String(body.contentType || '').slice(0, 150);
    const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return res.status(400).json({ error: 'That design file type is not accepted.' });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'The design file must be 10 MB or smaller.' });
    }

    const date = new Date().toISOString().slice(0, 10);
    const pathname = `quote-uploads/${date}/${randomUUID()}-${safeFilename(fileName)}`;
    const validUntil = Date.now() + 15 * 60 * 1000;
    const tokenOptions = {
      pathname,
      operations: ['put'],
      maximumSizeInBytes: MAX_FILE_SIZE,
      validUntil,
    };
    if (contentType) tokenOptions.allowedContentTypes = [contentType];

    const token = await issueSignedToken(tokenOptions);
    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: 'put',
      validUntil,
      // We already generate a UUID in the pathname, so an extra Blob suffix
      // is unnecessary. The client still reads the final upload response as
      // the source of truth in case Vercel changes the stored pathname.
      addRandomSuffix: false,
    });

    return res.status(200).json({
      pathname,
      presignedUrl,
      downloadUrl: `/api/quote-file?path=${encodeURIComponent(pathname)}`,
    });
  } catch (error) {
    console.error('Quote upload signing error:', error);
    return res.status(500).json({ error: 'File storage is not ready. Please try again later.' });
  }
}
