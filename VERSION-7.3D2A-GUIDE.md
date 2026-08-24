# Imaginable OS 7.3-D2A — Secure Square Webhook Receiver

Creates `/api/square-webhook`.

This stage:
- lets Square reach the Imaginable Things website,
- validates Square webhook signatures after configuration,
- does not change Job Tracker payment totals yet.

Bootstrap mode:
Before `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SQUARE_WEBHOOK_URL` are set,
the endpoint can answer Square, but it does not process any event.

Later Vercel variables:
- SQUARE_WEBHOOK_SIGNATURE_KEY
- SQUARE_WEBHOOK_URL

Install:
1. Copy this package into the project root.
2. Run `git status`.
3. Do not commit or push until reviewed.
