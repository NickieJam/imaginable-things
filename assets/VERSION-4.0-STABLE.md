# Imaginable Things — Version 4.0 Stable

## Corrections included

- Services now render correctly from `data/services.json`.
- Fixed the reveal class mismatch that made dynamically loaded service cards invisible.
- Enabled and completed the new `Vinyl & Banners` service.
- Added a `Get a Quote` action inside the mobile navigation menu.
- Removed the unfinished duplicate quote-wizard section from the page.
- Added version parameters to CSS and JavaScript to reduce stale mobile caching.
- Added Vercel no-cache headers for the HTML homepage and CMS JSON files.
- Updated the site version metadata to 4.0.0.

## Publish

```bat
git add .
git commit -m "Release stable version 4.0"
git push origin main
```

After Vercel reports **Ready**, open the production site on the phone and refresh it. If the old version remains open, close the browser tab completely and reopen the site.
