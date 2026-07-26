# Version 6.7.3 — Download Page UX Fix

## Purpose
Make customer artwork easier to download from quote messages.

## Changes
- Adds `download-design.html`, a simple branded download page.
- Updates `script.js` so WhatsApp gets a branded Imaginable Things URL instead of the raw API endpoint.
- The page shows the original file name and a large **Download Original Design** button.
- The private Blob still stays private; the button calls `/api/quote-file` to retrieve it.

## Test after deployment
Submit a NEW quote with a NEW file. The WhatsApp message should contain a URL beginning with:

`https://www.imaginablethingsllc.com/download-design.html?path=...`

Open it and press **Download Original Design**.
