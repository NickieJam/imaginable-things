# Imaginable OS 7.3-D3B — Production Safety & Cleanup

Adds a server-backed LIVE payment safety confirmation.

Before a Production Payment Link is created:
1. Imaginable OS asks the API for a preview only.
2. The API returns the exact job, amount, payment type and environment.
3. Production shows a REAL MONEY confirmation.
4. The second API request must include explicit LIVE confirmation.
5. The server refuses Production link creation without that confirmation.

Also adds:
- LIVE MODE / REAL MONEY warning
- Open LIVE Checkout label
- Copy Customer Link
- Share button (native share when available, clipboard fallback)

Sandbox remains a test environment and does not require the LIVE confirmation.
