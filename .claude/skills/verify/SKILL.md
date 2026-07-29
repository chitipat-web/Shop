---
name: verify
description: Build, run, and drive the Shop expense-splitting app end-to-end to verify changes at the real UI surface.
---

# Verify the Shop app

Next.js 16 (App Router, Turbopack) + better-sqlite3. SQLite file lives at
`data/shop.db` (gitignored). Delete `data/` before a run for a clean seed
(2 persons, 2 stores are auto-seeded on first connection).

## Build & launch

```bash
npm run build                      # must pass first
rm -rf data                        # optional: fresh DB
# DATABASE_URL="" forces local SQLite even when .env.local has the Neon
# prod URL; AUTH_DISABLED=1 bypasses Google login (never set on Vercel).
DATABASE_URL="" AUTH_DISABLED=1 npm run start -- -p 3000 &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/   # expect 200
```

Auth flow checks (without AUTH_DISABLED): unauthenticated `GET /` →
307 to `/auth/sign-in`; clicking the Google button → 303 → Neon Auth
`/sign-in/social/init` URL. Full Google login is manual-only.

## Drive (Playwright, chromium at /opt/pw-browsers/chromium)

Install playwright in a scratch dir (not in this repo). Viewport
390x844 (mobile-first UI). Flows worth driving:

Currency is ₪ (shekel); "today" uses Asia/Jerusalem. Money columns are
still named `*_satang` (unit = 1/100 ₪).

1. `/` Quick Add: pick store button, fill `input[name="amount"]`,
   pick payer, submit → redirects to `/?added=1`. Optional personal
   (no-split) amounts behind "+ มีของส่วนตัวไม่หารในบิลนี้" →
   `input[name="personal_p1"]` / `personal_p2`; client disables submit
   when their sum exceeds the amount. Attaching a receipt photo triggers
   on-device OCR (tesseract.js heb+eng, assets self-hosted in
   `public/ocr` — restart `next start` after touching them: public/ is
   snapshotted at boot). Status shows in `[data-testid="ocr-status"]`;
   an empty amount field is autofilled from the bill's total (สה"כ /
   לתשלום line, else max decimal amount). Test by drawing a receipt on
   an in-page canvas and dispatching a change event on the file input;
   first scan loads ~13MB of assets, allow 2-3 min.
2. `/list`: summary card shows total, per-person paid, net line
   ("X ติด Y อยู่ ฿…"). Edit via `a[aria-label="แก้ไขรายการ"]` →
   `/edit/<id>` (prefilled form, submit → `/list?updated=1`).
   Delete via `button[aria-label="ลบรายการ"]`.
3. `/settle`: share_i = personal_i + (total − personal1 − personal2)/2;
   transfer = |paid1 − share1|. With no personal amounts that reduces
   to |paid1 − paid2| / 2. Click "เคลียร์แล้ว" → `/settle?done=1`,
   list becomes empty, history appears.
4. `/settings`: rename persons/stores, toggle มีบิล, add store,
   CSV download link at `/export` (BOM + Thai headers). Admin also sees
   "ประวัติการแก้ไข / ลบ" — an audit log written by every purchase
   update/delete (actor, per-field old → new diffs, Israel-time stamp);
   hidden from non-admins.
5. Roles: `AUTH_DEV_PERSON=2` runs as the non-admin — no settle
   button, no store management, can only edit/delete own rows.

## Gotchas

- Server actions redirect on success — assert with `waitForURL`,
  not response codes.
- Amounts are satang integers server-side; "1,234.5" input is valid.
- Invalid amounts (abc, 0, negative) redirect to `/?error=invalid`.
- Purchases added after a settlement start a fresh round — settled
  rows are locked (`settlement_id` set) and never shown in `/list`.
