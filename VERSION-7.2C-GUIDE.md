# Imaginable OS 7.2-C — Lead Management

Adds direct lead follow-up management from Imaginable OS.

You can update:
- Lead status
- Next follow-up date

## Required Vercel environment variables
Before publishing, configure:
- GITHUB_CONTENT_TOKEN
- IMAGINABLE_ADMIN_PIN

GITHUB_CONTENT_TOKEN should be a fine-grained GitHub token limited to the NickieJam/imaginable-things repository with Contents: Read and write.

IMAGINABLE_ADMIN_PIN should be a private PIN/password known only to the administrator.

Never put either secret in JavaScript or GitHub.

## Safety
The API only updates `status` and `next_follow_up` for the selected lead in `data/leads.json`.

## Install
1. Copy package files into the project root.
2. Run: node apply-v7-2c.js
3. Run: git status
4. Do not commit or push until the Vercel secrets are configured.
