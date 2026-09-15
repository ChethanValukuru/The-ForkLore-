# The ForkLore — landing page

Static landing page for the ForkLore waitlist.

## Structure
- `index.html` — the landing page (self-contained; deployed to Vercel).
- `vercel.json` — static hosting config (clean URLs, no-cache on the HTML so
  edits go live immediately).
- `.vercelignore` — keeps `backend/` out of the public deployment.
- `backend/` — Google Apps Script that powers the waitlist form:
  - `Code.gs` — receives form submissions, appends them to a Google Sheet, and
    emails the full list every Sunday. **Not deployed with the site.**
  - `DEPLOY.md` — Apps Script setup steps.

## Deploying on Vercel
1. Import this repo in Vercel.
2. Framework Preset: **Other**. No build command, no output directory —
   it's a static site served from the repo root.
3. Deploy. `index.html` is served at `/`.
4. (Optional) Add your custom domain in Vercel → Project → Settings → Domains.

## Waitlist backend
The form in `index.html` POSTs to a deployed Google Apps Script web app.
See `backend/DEPLOY.md` to (re)deploy or change the recipient list.
