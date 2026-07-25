# Version 6.7.1 — Private File Download Hotfix

Fixes quote design downloads from the private Vercel Blob store.

## Problem
The original 6.7 download endpoint generated a malformed signed Blob redirect in production.

## Fix
- Reads the private Blob server-side with `get()`.
- Streams the original file through `/api/quote-file`.
- Sends `Content-Disposition: attachment` so browsers download the original file.
- Pins `@vercel/blob` to a current version supporting private reads and consistent reads.

No customer content or existing Blob files are replaced.
