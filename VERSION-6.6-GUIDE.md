# Version 6.6 — Workflow Engine Foundation

This sprint connects Lead Inbox, Job Tracker and Customer Hub.

## Workflow
1. Open Lead Inbox and tap **Convert to Job**.
2. A prefilled job draft opens in Job Tracker.
3. Copy the prepared fields and open Pages CMS to save the job.
4. From Job Tracker, tap **Prepare Customer** when the job is delivered.
5. Copy the customer fields and save them in Customer Hub through Pages CMS.

## Important technical note
The site is currently static and Pages CMS saves through GitHub. For security, the public dashboard cannot directly write into the repository. Version 6.6 prepares and transfers the information without making you retype it, but the final **Save** is completed inside Pages CMS.

True one-tap automatic creation will require the planned secure backend/database sprint.

## New files
- data/customers.json
- admin/customers.html
- admin/customers.js

## Updated files
- .pages.yml
- admin/index.html
- admin/dashboard.js
- admin/leads.html
- admin/leads.js
- admin/jobs.html
- admin/jobs.js
- ROADMAP.md
