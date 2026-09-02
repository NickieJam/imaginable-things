# Imaginable OS 7.3-D3C — Payment Link Control

Adds persistent Square Payment Link management to each Job.

From now on, when a Square Payment Link is created, Imaginable OS saves:
- payment link ID
- URL
- deposit/balance type
- amount
- active/deactivated status
- Square environment
- created/deactivated timestamps

Payment Management can then:
- reopen the saved link
- copy it
- share it
- deactivate it directly from Imaginable OS

Security:
- Admin PIN is required.
- The server reads the payment link ID from the saved Job; the browser cannot choose an arbitrary Square Payment Link ID to delete.
- Production/Sandbox environment mismatch is rejected.
- Deactivation uses Square DELETE /v2/online-checkout/payment-links/{id}.

Important:
Links created before 7.3-D3C are not retroactively attached to Jobs.
