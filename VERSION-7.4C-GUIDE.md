# Imaginable Things 7.4-C — Secure Proof Upload + Production Clearance Gate

## What changes

### 1. No manual proof URL
The Proof Approval window now accepts a local:
- PNG
- JPG/JPEG
- WebP
- PDF

Maximum: 25 MB.

The browser uploads the proof directly to the project's PRIVATE Vercel Blob
store using a short-lived, single-file signed PUT URL. The long-lived Blob
credential is never sent to the browser.

### 2. Private customer proof viewing
A customer's approval page receives a time-limited signed GET URL for only the
specific proof attached to the current approval request.

The raw private Blob credential is never exposed to the customer.

### 3. Proof fingerprint
New private proofs are bound to the approval record using:
- Blob pathname
- filename
- content type
- Blob ETag
- proof version
- customer-facing notes
- policy version

The approval record stores a SHA-256 fingerprint of those details.

### 4. Production Clearance Gate
Every Job card displays:
- NOT CLEARED FOR PRODUCTION
- CLEARED FOR PRODUCTION
- or a warning if a Job is already marked In Production without approval.

The new Start Production button calls a server endpoint. The server refuses to
move a Job into `production` unless the CURRENT approval is approved and its
proof fingerprint still matches.

Creating a new/revised proof automatically blocks production clearance again
until that proof is approved.

### 5. Backward compatibility
Existing 7.4-B URL-based approvals keep their original fingerprint format and
continue to work.

## Requirement
7.4-C requires @vercel/blob 2.4 or newer for Signed URLs. The installer checks
the project's installed version. If necessary, it automatically updates
@vercel/blob to a compatible 2.x version and updates package files.

## Install
Copy package contents into the project root and run:

`node apply-v7-4c.js`

Then remove the installer before commit.
