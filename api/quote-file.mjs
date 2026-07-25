import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
import path from 'node:path';

function validQuotePath(pathname) {
  return typeof pathname === 'string'
    && pathname.startsWith('quote-uploads/')
    && !pathname.includes('..')
    && pathname.length < 500;
}

function originalFilename(pathname) {
  const base = path.posix.basename(pathname || 'design-file');
  // Uploaded files are stored as: <uuid>-<safe-original-name>
  return base.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i, '') || 'design-file';
}

function safeHeaderFilename(name) {
  return String(name || 'design-file').replace(/[\r\n"\\]/g, '_');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed.');
  }

  const pathname = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
  if (!validQuotePath(pathname)) {
    return res.status(400).send('Invalid design file link.');
  }

  try {
    const result = await get(pathname, {
      access: 'private',
      useCache: false,
    });

    if (!result || !result.stream || !result.blob) {
      return res.status(404).send('Design file not found.');
    }

    const filename = originalFilename(pathname);
    const safeFilename = safeHeaderFilename(filename);
    const encodedFilename = encodeURIComponent(filename);

    res.statusCode = 200;
    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    if (Number.isFinite(result.blob.size)) {
      res.setHeader('Content-Length', String(result.blob.size));
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    Readable.fromWeb(result.stream).pipe(res);
  } catch (error) {
    console.error('Quote file download error:', error);
    const status = error?.status || error?.statusCode;
    if (status === 404) {
      return res.status(404).send('Design file not found.');
    }
    return res.status(500).send('This design file is temporarily unavailable.');
  }
}
