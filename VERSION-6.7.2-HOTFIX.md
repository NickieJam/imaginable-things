# Imaginable Things — Version 6.7.2 Hotfix

## Fix
The quote uploader now uses the **exact pathname returned by Vercel Blob after the upload finishes** when it creates the “Download original design” link.

This fixes the `Design file not found.` error caused when Blob stored a file with an extra random suffix that was not present in the pathname originally requested by the site.

The upload-signing endpoint also requests `addRandomSuffix: false`. The filename is already unique because the site prefixes every upload with a UUID.

## Files changed
- `script.js`
- `api/quote-upload-url.mjs`

## Test after deployment
Create a **new** quote and upload a new test image. Old WhatsApp links created before 6.7.2 still contain the old incorrect pathname and are not expected to repair themselves.
