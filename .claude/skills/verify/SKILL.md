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
rm -rf data                       # optional: fresh DB
npm run start -- -p 3000 &        # production server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/   # expect 200
```

## Drive (Playwright, chromium at /opt/pw-browsers/chromium)

Install playwright in a scratch dir (not in this repo). Viewport
390x844 (mobile-first UI). Flows worth driving:

1. `/` Quick Add: pick store button, fill `input[name="amount"]`,
   pick payer, submit → redirects to `/list?added=1`.
2. `/list`: summary card shows total, per-person paid, net line
   ("X ติด Y อยู่ ฿…"). Delete via `button[aria-label="ลบรายการ"]`.
3. `/settle`: transfer line = |paid1 − paid2| / 2. Click
   "เคลียร์แล้ว" → `/settle?done=1`, list becomes empty, history appears.
4. `/settings`: rename persons/stores, toggle มีบิล, add store.

## Gotchas

- Server actions redirect on success — assert with `waitForURL`,
  not response codes.
- Amounts are satang integers server-side; "1,234.5" input is valid.
- Invalid amounts (abc, 0, negative) redirect to `/?error=invalid`.
- Purchases added after a settlement start a fresh round — settled
  rows are locked (`settlement_id` set) and never shown in `/list`.
