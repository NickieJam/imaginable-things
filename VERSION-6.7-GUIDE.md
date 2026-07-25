# Imaginable Things 6.7 — Quote Upload & File Storage

## What changed

The Smart Quote Wizard no longer only remembers the name of the customer's design file.

When a customer finishes a quote:

1. The selected design is uploaded directly from the customer's browser to a **private Vercel Blob store**.
2. The original file stays in its original format.
3. WhatsApp opens with the quote details.
4. The WhatsApp message contains a **Download original design** link.
5. Opening that link generates a fresh short-lived private download URL and downloads/opens the original file.

The current 10 MB Smart Quote limit remains in place.

## Accepted formats

PNG, JPG, JPEG, WEBP, PDF, SVG, AI, EPS, DST, EMB, PES, EXP, JEF, VP3, HUS and XXX.

## One-time Vercel setup

After pushing Version 6.7:

1. Open the Imaginable Things project in Vercel.
2. Open **Storage**.
3. Create a **Blob** store.
4. Choose **Private** access.
5. Connect the store to the Imaginable Things project if Vercel asks.
6. Redeploy the latest deployment after the store is connected.

New Vercel Blob projects use project-scoped OIDC authentication, so the site code does not contain a storage password.

## Test

Use the live website and submit a Smart Quote with a small PNG, PDF, DST, or other supported file.

The WhatsApp message should include:

`Download original design: https://www.imaginablethingsllc.com/api/quote-file?...`

Open that link on the computer and verify that the original customer file is accessible.

## Security note

The Blob itself is private. The `/api/quote-file` link acts as the controlled download gateway and creates a temporary signed Blob URL. The link is intentionally hard to guess because every upload uses a random UUID. Full Imaginable OS authentication can later make these downloads account-only.
