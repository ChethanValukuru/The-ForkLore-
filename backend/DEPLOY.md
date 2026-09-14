# ForkLore waitlist backend — setup (~5 minutes)

Form submission → Google Sheet, plus a full list emailed to
**chethanvalukuru@gmail.com every Sunday**. No server, no cost — it all lives in
your own Google account via Google Apps Script.

## 1. Create the Sheet
1. Go to https://sheets.google.com and create a **blank spreadsheet**.
2. Name it e.g. `ForkLore Waitlist`. (You don't need to add columns — the script
   creates a `Waitlist` tab with headers on first submission.)

## 2. Add the script
1. In the sheet: **Extensions → Apps Script**.
2. Delete the sample `function myFunction() {}`.
3. Paste the entire contents of **`Code.gs`** from this folder. Click 💾 Save.

## 3. Schedule the Sunday email
1. In the Apps Script editor, choose the function **`setupTrigger`** in the toolbar
   dropdown and click **Run**.
2. It asks for authorization the first time → **Review permissions** → pick your
   Google account → *Advanced → Go to (project) → Allow*.
   (The "unverified app" warning is normal for your own script.)
3. This creates a trigger that runs `weeklyDigest` every Sunday ~8am in the
   script's timezone. Change the day/hour by editing `setupTrigger()` if you like.
4. (Optional) Run **`weeklyDigest`** once now to confirm the email arrives.

## 4. Deploy the POST endpoint
1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Set:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*   ← required so the landing page can post.
4. **Deploy**, authorize if asked, then **copy the Web app URL**
   (looks like `https://script.google.com/macros/s/AKfyc.../exec`).
5. Sanity check: open that URL in a browser — you should see
   `{"ok":true,"service":"forklore-waitlist"}`.

## 5. Connect the landing page
Send me that Web app URL and I'll wire it into the form, **or** do it yourself:
in `ForkLore Landing.html` find the token `__WAITLIST_ENDPOINT__` and replace it
with your URL.

## Notes / limits
- The form posts with `mode: 'no-cors'` (fire-and-forget), which avoids all CORS
  setup. The visitor always sees the success state; the row lands in the Sheet.
- Duplicate emails are skipped automatically (case-insensitive).
- Gmail send quota for a consumer account is ~100 emails/day — irrelevant here
  since it's one weekly email to you.
- **If you re-deploy after editing `Code.gs`:** use *Deploy → Manage deployments →
  edit (pencil) → New version*, which keeps the **same URL**. A brand-new
  deployment gives a new URL you'd have to re-paste.
