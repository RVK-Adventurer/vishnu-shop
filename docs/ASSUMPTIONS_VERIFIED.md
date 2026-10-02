# Assumptions Verified

This file records every outside fact the shop's code depends on: what it is, where it was checked, when, and whether it is confirmed.

- **VERIFIED** = checked against the official page on the date shown.
- **PARTLY VERIFIED** = the main fact was checked; a detail was not on the page we read. The code is written defensively for that detail.
- **UNVERIFIED** = not yet checked. The code is written so that it still works if the fact turns out to be different.
- **TO CHECK IN PHASE n** = the code that needs this fact is written in a later phase. We will check it then, right before writing that code, so the information is fresh.

Last updated: 2 October 2026 (Phase 1 + v1.9 additions).

---

## 1. Google Apps Script (the "shop manager")

| # | Fact | Value used in the code | Source | Checked | Status |
|---|---|---|---|---|---|
| 1.1 | Email recipients per day (consumer Gmail) | 100 / day. We only send a handful of owner alerts, never customer receipts. | developers.google.com/apps-script/guides/services/quotas | 1 Oct 2026 | VERIFIED |
| 1.2 | URL Fetch calls per day | 20,000 / day | same | 1 Oct 2026 | VERIFIED |
| 1.3 | Total trigger runtime per day | 90 minutes / day. `tick` runs 288 times a day, so each run must average under about 18 seconds. We target under 10 seconds and exit at once when idle. | same | 1 Oct 2026 | VERIFIED |
| 1.4 | Max runtime of one execution | 6 minutes. Long jobs stop safely at 4.5 minutes and resume next run. | same | 1 Oct 2026 | VERIFIED |
| 1.5 | Simultaneous executions per user | 30 | same | 1 Oct 2026 | VERIFIED |
| 1.6 | Triggers per user per script | 20. We use only 2 (`tick`, `daily`). | same | 1 Oct 2026 | VERIFIED |
| 1.7 | Script Properties limits | 9 KB per value, 500 KB total. Daily usage counters are tiny JSON (well under 1 KB); keys older than 7 days are deleted. | same | 1 Oct 2026 | VERIFIED |
| 1.8 | URL Fetch response size | 50 MB per call | same | 1 Oct 2026 | VERIFIED |
| 1.9 | CacheService limits | key ≤ 250 characters; value ≤ 100 KB; expiry max 6 hours (21,600 s); about 1,000 items per cache, after which it keeps the 900 farthest from expiry. Product lookup maps are split into chunks under 90 KB. Rate-limit keys use short expiries so they don't crowd out the price cache. Admin sessions are capped at 6 hours to match. | developers.google.com/apps-script/reference/cache/cache | 1 Oct 2026 | VERIFIED |
| 1.10 | LockService | `getScriptLock()` blocks every user from running the locked section at the same time. A lock is only held after `waitLock`/`tryLock`. We use `waitLock(10000)`. | developers.google.com/apps-script/reference/lock/lock-service | 1 Oct 2026 | VERIFIED (the page gives no maximum wait time; 10 s is a safe, commonly used value) |
| 1.11 | `doPost` cannot read request headers or the caller's IP | Tokens travel inside the JSON body; we never claim to log IP addresses. | Long-standing documented behaviour of `doPost(e)` (the event object has no headers field) | 1 Oct 2026 | VERIFIED |
| 1.12 | Browser → web app calls work across sites only as "simple requests" | `POST`, `Content-Type: text/plain;charset=utf-8`, no custom headers, follow the redirect. | Long-standing behaviour | 1 Oct 2026 | VERIFIED (re-tested live in Phase 2 when `api.js` is written) |
| 1.13 | OAuth scope strings in `appsscript.json` | `spreadsheets`, `script.external_request`, `script.send_mail`, `script.scriptapp`, `script.container.ui`, `drive` (full URLs in the file). | Apps Script scopes guide (shows how to set `oauthScopes`; the full string list is on Google's OAuth scopes page) | 1 Oct 2026 | PARTLY VERIFIED — the strings are the standard ones. **Self-check during setup:** after pasting, open Overview → Project OAuth Scopes; it must list exactly these six. |
| 1.14 | Why the full `drive` scope (not `drive.file`) | Daily backups copy the shop spreadsheet itself, and archives/invoices/photos live in Drive folders. `drive.file` only covers files the script created, so it cannot copy the shop spreadsheet. | Design decision | 1 Oct 2026 | — |
| 1.15 | `Utilities.computeHmacSha256Signature`, `Blob.getAs("application/pdf")` limits | Needed for Razorpay signature (Phase 3) and invoices (Phase 4). | — | — | TO CHECK IN PHASE 3 / 4 |

## 2. Google Sheets (the "account book")

| # | Fact | Value used | Source | Checked | Status |
|---|---|---|---|---|---|
| 2.1 | Cell limit per spreadsheet | **We design against 10,000,000 cells** (constant `SHEET_CELL_LIMIT` in `Config.gs`). | Long-standing limit | 1 Oct 2026 | VERIFIED |
| 2.2 | Doubled limit (20,000,000 cells) | Google announced general availability on 10 Sep 2026 (Rapid Release) and 28 Sep 2026 (Scheduled Release), rolling out gradually over about 15 days, and **it includes personal Google accounts**. We treat it as a bonus safety margin only; the meters still measure against 10 million. | workspaceupdates.googleblog.com — "Doubled cell limits in Google Sheets now generally available" (Sep 2026) | 1 Oct 2026 | VERIFIED |
| 2.3 | Allocated (empty) grid cells count toward the limit | Usage = sum of `getMaxRows() × getMaxColumns()` over all tabs; the daily job trims empty rows/columns. | Long-standing behaviour | 1 Oct 2026 | VERIFIED |

## 3. Cloudflare Pages (the "shop window")

| # | Fact | Value used | Source | Checked | Status |
|---|---|---|---|---|---|
| 3.1 | Builds per month (Free) | 500. Our publishing uses at most 12/day ≈ 360/month. | developers.cloudflare.com/pages/platform/limits (updated 5 Sep 2026) | 1 Oct 2026 | VERIFIED |
| 3.2 | Concurrent builds | 1 at a time, counted per account | same | 1 Oct 2026 | VERIFIED |
| 3.3 | Build timeout | 20 minutes | same | 1 Oct 2026 | VERIFIED |
| 3.4 | Files per site | 20,000 (prerendered pages count too). Warn at 80% = 16,000. | same | 1 Oct 2026 | VERIFIED |
| 3.5 | Max single file size | 25 MiB | same | 1 Oct 2026 | VERIFIED |
| 3.6 | `_headers` limits | 100 header rules, 2,000 characters per header line. Our CSP line must stay under 2,000 characters. | same | 1 Oct 2026 | VERIFIED |
| 3.7 | `_redirects` limits | 2,000 static + 100 dynamic redirects | same | 1 Oct 2026 | VERIFIED |
| 3.8 | New accounts | Temporary limits on creating projects in the first 48 hours. The Setup Guide warns about this. | same | 1 Oct 2026 | VERIFIED |
| 3.9 | Node.js in the build | Build image v3 defaults to Node 22.16.0; `NODE_VERSION` accepts any version. No v4 image is planned. **We set `NODE_VERSION` = `22`.** Our build script uses only Node built-ins. | developers.cloudflare.com/pages/configuration/build-image | 1 Oct 2026 | VERIFIED |

## 4. GitHub (the "storeroom")

| # | Fact | Value used | Source | Checked | Status |
|---|---|---|---|---|---|
| 4.1 | GitHub Pages may NOT be used for a shop | "GitHub Pages is not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site…". **We never enable GitHub Pages.** GitHub only stores files; Cloudflare Pages publishes them. | docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits | 1 Oct 2026 | VERIFIED |
| 4.2 | Repository size guidance | 1 GB recommended maximum. We warn at 70% (700 MB). | same | 1 Oct 2026 | VERIFIED |
| 4.3 | Token expiry header | Responses carry `github-authentication-token-expiration`. A bug in Sep 2025 made it return the wrong time for fine-grained tokens; it was fixed. We read it if present and **also** let the owner type the expiry date in the setup menu as a fallback. | github.com/google/go-github/issues/3708; docs.github.com "Managing your personal access tokens" | 1 Oct 2026 | VERIFIED |
| 4.4 | Fine-grained tokens can be limited to one repository with "Contents: Read and write" | Used for publishing | docs.github.com "Managing your personal access tokens" | 1 Oct 2026 | VERIFIED |
| 4.5 | Git Data API (blobs → trees → commits → refs) | One commit per publish | — | — | TO CHECK IN PHASE 2 |

## 5. Razorpay (the "card machine" — optional)

| # | Fact | Value used | Source | Checked | Status |
|---|---|---|---|---|---|
| 5.1 | Create order | `POST https://api.razorpay.com/v1/orders`; `amount` integer in paise (minimum 100 paise), `currency` `INR`; `receipt` ≤ 40 characters, ASCII, unique; `notes` ≤ 15 pairs of ≤ 256 characters. Our order ids (`ORD-YYMMDD-XXXXX`, 16 characters) fit. Create a NEW Razorpay order for every attempt. | razorpay.com/docs/api/orders/create | 1 Oct 2026 | VERIFIED |
| 5.2 | Signature check | `hmac_sha256(order_id + "|" + razorpay_payment_id, key_secret)` compared to `razorpay_signature` (hex) | razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps | 1 Oct 2026 | VERIFIED |
| 5.3 | Handler fields | `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` | same | 1 Oct 2026 | VERIFIED |
| 5.4 | Checkout options | `key`, `amount`, `currency`, `order_id`, `prefill {name, email, contact}`, `handler`, `timeout` (seconds) | same | 1 Oct 2026 | VERIFIED |
| 5.5 | Hiding methods | `config.display.hide: [{ method: "card" }, …]`, with `sequence`, `blocks`, `preferences.show_default_blocks` | razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/understand-configuration | 1 Oct 2026 | PARTLY VERIFIED — the shape is confirmed; the page only shows `card` as an example method name. We will use `card`, `upi`, `netbanking`, `wallet`, `emi`, `paylater` and re-check the full list in Phase 3. If a name is wrong, Razorpay simply shows that method, and our server still accepts the correct payment (Section 7.4 step 5). |
| 5.6 | Fetch payment | `GET /v1/payments/:id`; statuses `created`, `authorized`, `captured`, `refunded`, `failed` | razorpay.com/docs/api/payments/fetch-with-id | 1 Oct 2026 | VERIFIED |
| 5.7 | Payments of an order | `GET /v1/orders/:id/payments` → `{ entity: "collection", count, items: [...] }` | razorpay.com/docs/api/orders/fetch-payments | 1 Oct 2026 | VERIFIED |
| 5.8 | Capture | `POST /v1/payments/:id/capture` body `{ amount, currency }`; amount must equal the authorised amount | razorpay.com/docs/api/payments/capture | 1 Oct 2026 | VERIFIED |
| 5.9 | Refund | `POST /v1/payments/:id/refund` body `{ amount, speed?, notes?, receipt? }`; refund status `pending` / `processed` / `failed` | razorpay.com/docs/api/refunds/create-normal | 1 Oct 2026 | VERIFIED |
| 5.10 | Webhooks | Not used — Apps Script cannot read the `X-Razorpay-Signature` header. Reconciliation polling replaces them. | Follows from 1.11 | 1 Oct 2026 | VERIFIED |
| 5.11 | Auto-capture setting, test-mode UPI, CSP domains, required policy pages | — | — | — | TO CHECK IN PHASE 3 |

## 6. UPI (Direct UPI option)

| # | Fact | Value used | Source | Checked | Status |
|---|---|---|---|---|---|
| 6.1 | Generic link | `upi://pay?pa=…&pn=…&am=…&cu=INR&tn=…`, every value URL-encoded; only `pa` is strictly required. | NPCI UPI Linking Specification 1.6 (via labnol.org copy); dvaarik.com UPI deep-linking guide | 1 Oct 2026 | VERIFIED |
| 6.2 | App behaviour varies | Some apps lock the pre-filled amount, some let the payer edit it; links can fail inside social apps' browsers; iOS has no shared UPI chooser. **This is exactly why every customer also gets the QR, "Save QR", copyable UPI ID and the exact-amount check by a person.** | dvaarik.com UPI guide | 1 Oct 2026 | VERIFIED |
| 6.3 | iOS app link formats | Google Pay: `gpay://upi/pay?…` (official Google Pay India docs). Schemes `phonepe://`, `paytmmp://`, `tez://` are listed as common UPI schemes by NTT DATA Payment Services' iOS guide. Full path formats for PhonePe (`phonepe://pay?…`), Paytm (`paytmmp://pay?…`) and BHIM are not confirmed by an official page. | developers.google.com/pay-wallet/regions/india/api/ios/in-app-payments; in.nttdatapay.com UPI intent on iOS | 1 Oct 2026 | Google Pay VERIFIED; others PARTLY VERIFIED — they ship in `upi-apps.json` and are re-checked in Phase 3; anything still unconfirmed then ships `enabled: false`. |
| 6.4 | Limits on paying personal (P2P) UPI IDs, merchant vs personal IDs | The guide recommends a business/merchant UPI ID. | — | — | TO CHECK IN PHASE 3 |

## 7. Browsers and devices

| # | Fact | How the code handles it | Source | Checked | Status |
|---|---|---|---|---|---|
| 7.1 | Web Share API (share sheet) is supported by Safari iOS 12.2+, Chrome Android, Samsung Internet, Edge; **not** by desktop Firefox. Sharing *files* is a separate, narrower feature. | `share.js` always checks `navigator.canShare({files})` before sharing a file and falls back to download / new tab / WhatsApp link. Links fall back to copying. | caniuse.com/web-share; MDN Navigator.canShare | 1 Oct 2026 | VERIFIED (exact per-browser file-sharing versions not listed; feature-detected at run time) |
| 7.2 | `navigator.clipboard.writeText` works only on https and may need a tap first. | `copyText()` tries it, then the old `execCommand('copy')`, then shows the text selected for "press and hold to copy". | MDN Clipboard.writeText | 1 Oct 2026 | VERIFIED |
| 7.3 | In-app browsers (WhatsApp, Instagram, Facebook) **silently drop downloads of in-memory ("blob:") files**, and on iOS no trick reliably opens Safari. Android `intent://` links may work but vary by app version. User-agent markers: `Instagram`, `FBAN`/`FBAV`/`FB_IAB`, `WhatsApp`. | `device.js` detects them; `share.js` never uses blob downloads inside them; `ui/inapp.js` shows "Open in Chrome" (Android) or "⋯ → Open in Safari" + "Copy page link" (iPhone). **Phase 3 design note:** the invoice must ALSO be reachable as a direct link/page (not only a blob), so in-app browsers can open it — and the "Send the Track link to my WhatsApp" fallback stays last. | github.com/docusealco/docuseal issue 719; flyn.to "Instagram in-app browser" | 1 Oct 2026 | VERIFIED |
| 7.4 | Minimum versions (Section 24.1): iOS/iPadOS 15+, Android 8+ with current Chrome. Native `<dialog>` arrived in Safari 15.4, `:has()` in 15.4, container units in 16. | `ui/dialog.js` has a built-in fallback when `<dialog>` is missing (iOS 15.0–15.3). CSS never relies on `:has()` or container units for anything essential (only small extras). Colour tints are pre-computed instead of `color-mix()`. | Platform release notes (long-standing) | 1 Oct 2026 | VERIFIED |
| 7.5 | Audio autoplay rules (sale sound needs one tap first) | — | — | — | TO CHECK IN PHASE 5 |
| 7.6 | QR code standard tables (ISO/IEC 18004, versions 1–10, level M) | — | — | — | TO CHECK IN PHASE 3 |
| 7.7 | Cloudflare dashboard path for a new Pages project: **Workers & Pages → Create application → Pages → Connect to Git**; build settings (build command, build output directory) and **Environment variables** are set before **Save and Deploy**. | Used word-for-word in Setup Guide step 8. | developers.cloudflare.com/pages/get-started/git-integration (updated 21 Apr 2026) | 1 Oct 2026 | VERIFIED |

## 9. v1.9 additions (2 October 2026)

| # | Fact | How the code handles it | Source | Checked | Status |
|---|---|---|---|---|---|
| 9.1 | India's *Guidelines for Prevention and Regulation of Dark Patterns, 2023* (CCPA, notified 30 Nov 2023) apply to online platforms and sellers. They prohibit "false urgency" (including deceptive product popularity or quantity claims) and "nagging" (repeated disruptive requests). Sellers must be able to show urgency claims were accurate. | Ratings and "bought" counts come only from real data (never typed), counts are rounded **down**, and popups are rate-limited (once per day / visit / ever), never on checkout, always closable. Documented in docs/V1.9_ADDITIONS.md. | Trilegal update on the Guidelines (PDF); IAPP article | 2 Oct 2026 | VERIFIED |
| 9.2 | Fonts Poppins, Lora, Mukta, Hind Madurai, Noto Sans Tamil and Baloo 2 are licensed under the SIL Open Font License 1.1, which allows bundling with a website. | Copied with their licence files into `public/assets/fonts/`, from the Fontsource packages (v5.3.0). Only Latin plus Tamil or Devanagari subsets, 400/600/700 weights. | Licence files inside each package | 2 Oct 2026 | VERIFIED |
| 9.3 | The strict security policy (no inline styles) still allows changing CSS variables from JavaScript and adding fonts with the FontFace API. | The style guide preview uses only these. The shop itself gets its display settings from the generated `brand.css`. | CSP Level 3 (`style-src` governs `<style>`/`style=` attributes, not CSSOM) | 2 Oct 2026 | VERIFIED (tested in Chromium with the shop's CSP) |
| 9.4 | Tamil translation | `public/strings/ta.json` is a draft; a native speaker must review it before go-live (noted in the file and the docs). | — | — | NEEDS HUMAN REVIEW |

## 8. Phase 1 design decisions (and why)

1. **Practice mode vs live mode.** `PRODUCTION=0` (practice): missing details are filled with sample values, every page says `noindex` and robots.txt blocks search engines, so a half-finished shop never appears on Google. `PRODUCTION=1` (live, Section 9.9): the build stops if any `REPLACE_ME` remains. The Setup Guide sets `0` first; the Go-Live checklist switches to `1`.
2. **One small stylesheet instead of inline critical CSS.** Section 16.4 suggests inlining critical CSS. With a strict security policy (no inline styles), that would need a per-build hash added to `_headers`, which is fragile for a beginner to maintain. Instead the five CSS files are bundled into one file of about 14 KB (gzip), well under the 30 KB budget, loaded once and then served from the phone's cache by the service worker. Re-measure in Phase 6 (PERFORMANCE_REPORT).
3. **JS and CSS caching.** File names don't carry a hash (no bundler — Section 0.8), so the server sends them with `no-cache` (a tiny "has it changed?" check), and the service worker keeps a per-build copy, which makes repeat visits instant. Product photos never change name once published, so they are cached for a year.
4. **Sample catalogue.** 24 products in 4 categories with drawn placeholder pictures (generated by the build, so nothing extra to upload). It disappears automatically the moment the admin first publishes `data/catalog.json`.
5. **Checkout before Phase 3.** `/checkout/` sends the cart to the shop on WhatsApp ("never a dead end", Section 7.0.3). The build stops generating this page automatically once `public/js/checkout.js` exists (Phase 3).
6. **Pincode → state suggestion** (`public/pincode-states.json`) uses the first three digits; a few border prefixes are ambiguous, which is why it is only ever a suggestion with "change if wrong" (Section 23.6.4).

7. **1.4: owner colours and gradients without inline styles.** All colours are written into the generated `css/brand.css`, never into the page. Values are accepted only as `#RRGGBB` codes (or 2–3 of them in a gradient), so a setting can't inject anything else (`public/js/theme.js`, tested). Text colour per area is chosen for WCAG 4.5 : 1 contrast on every part of the gradient.
8. **1.4: banner "once a day" without flashing.** The only script that runs before the page is drawn is `public/js/early.js` (about 1 KB, external file, so the strict security policy stays unchanged). Every other script still waits.
9. **1.4: favicon formats.** PNG and SVG work in all current browsers; Safari doesn't support SVG for the phone home-screen icon. A square PNG (512 × 512) is therefore recommended, and the build uses it for the home-screen icon automatically. `.ico` is accepted too.
10. **1.4: Word-style descriptions.** Formatting is carried by allow-listed classes (`rt-…`), not inline styles, because the security policy blocks `style=""`. The admin editor (Phase 2) produces only these, and the build re-cleans everything (`public/js/html.js`, tested against script, iframe, svg, javascript: links, broken HTML and bad character codes).

11. **1.5: Design preview without breaking the security policy.** The preview pages draw the shop with the same templates and apply the look with a "constructable stylesheet" (`document.adoptedStyleSheets`). That is allowed under `style-src 'self'`, and supported by Chrome/Edge 73+, Firefox 101+ and Safari 16.4+; older browsers get a plain-words message. Pictures being tried use `blob:` addresses, which `img-src` already allows. Preview frames are same-origin (`frame-ancestors 'self'`) and accept messages only from their own parent page.
12. **1.5: Private test copy.** Cloudflare Pages builds every non-production branch as a preview at `<branch>.<project>.pages.dev` and adds `X-Robots-Tag: noindex` to previews ([Cloudflare docs: preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)). The build reads `CF_PAGES_BRANCH` ([build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)) to add the ribbon and switch ordering off. **Settings → General → Enable access policy** protects preview addresses with Cloudflare Access. The Setup Guide asks the owner to confirm in a private window that the preview address asks for an email code.
13. **1.5: Cover picture shapes.** Fixed shapes per screen (3 : 1 computer, 2 : 1 tablet, 1 : 1 phone, ±2 %), switched with `<picture>` media queries at 768 px and 1280 px. The box takes the shape of the picture actually shown, so nothing is stretched. Only a photo is ever cropped, around the owner's focal point; a finished design (ARTWORK) is shown whole.

---

## Things that are impossible on the free stack (plain words)

Nothing in the spec is impossible. Three things work differently from a big paid platform, by design, and the spec already accounts for them:

1. **Razorpay webhooks can't be received** (Apps Script can't read headers). → A 5-minute check ("reconciliation") catches every payment instead.
2. **IP addresses can't be logged** (Apps Script never sees them). → The activity log records the user, time, session and device type instead, and says so honestly.
3. **Direct UPI and bank payments can't be checked automatically** (there's no free bank API). → A person checks the bank app and types the exact amount; the server refuses any mismatch.
