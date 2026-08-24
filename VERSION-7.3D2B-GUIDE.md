# Imaginable OS 7.3-D2B — Automatic Square Payment Sync

This stage upgrades `/api/square-webhook` so a verified, COMPLETED
Square `payment.updated` event can update the matching Job Tracker payment.

A Square Payment Link created by 7.3-D1 includes a payment note such as:
`Deposit for IT-2026-001 - Customer Name`

The webhook uses that job number to update:
- amount_paid
- balance_due
- payment_status

Idempotency:
Processed Square Payment IDs are stored in `square_payment_ids`, so webhook
retries or later updates to the same Square Payment cannot count the same
payment twice.

Pages CMS:
The Square sync metadata fields are added as hidden fields so CMS saves do
not remove them.

Install:
1. Copy package contents into the project root.
2. Run: node apply-v7-3d2b.js
3. Run: git status
4. Do not commit or push until reviewed.
