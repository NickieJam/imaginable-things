# Imaginable OS 7.3-D1 — Square Sandbox Payment Links

Adds Square-hosted Sandbox checkout links to Payment Management.

Files:
- api/create-square-payment-link.mjs
- admin/square-payment-links.js
- apply-v7-3d1.js

Required Vercel environment variables:
- SQUARE_ACCESS_TOKEN
- SQUARE_LOCATION_ID
- SQUARE_ENVIRONMENT=sandbox
- IMAGINABLE_ADMIN_PIN
- GITHUB_CONTENT_TOKEN

The API determines payment amounts from data/jobs.json on GitHub.
It does not trust a payment amount sent by the browser.

Install:
1. Copy the package contents into the project root.
2. Run: node apply-v7-3d1.js
3. Run: git status
4. Do not commit or push until reviewed.
