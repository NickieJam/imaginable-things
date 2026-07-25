import { issueSignedToken, presignUrl } from '@vercel/blob';

function validQuotePath(pathname) {
  return typeof pathname === 'string'
    && pathname.startsWith('quote-uploads/')
    && !pathname.includes('..')
    && pathname.length < 500;
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
    const validUntil = Date.now() + 5 * 60 * 1000;
    const token = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: 'get',
      validUntil,
      useCache: false,
    });
    res.setHeader('Location', presignedUrl);
    return res.status(302).end();
  } catch (error) {
    console.error('Quote file download error:', error);
    return res.status(500).send('This design file is temporarily unavailable.');
  }
}
