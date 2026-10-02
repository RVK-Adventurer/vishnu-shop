# Shop Template — Free Tier (v1.8)

A complete online shop for small Indian businesses that costs **₹0 per month** to run (only the domain renewal, plus Razorpay's commission *if* the owner turns Razorpay on). One copy is made for each shop owner, in the owner's own accounts.

It handles **50 to 500 online orders a day**, takes payments by Razorpay, direct UPI, bank transfer, Cash on Delivery or "call me first" order requests, gives every customer an instant PDF tax invoice on screen (no emails), and includes a full admin website for the owner and staff.

> **Start here:** [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) — numbered, click-by-click steps. No coding knowledge needed.

---

## How it fits together (architecture)

| Part | Real-shop comparison | What it does | Cost |
|---|---|---|---|
| Google Sheet | The account book | Holds products, orders, stock, settings | Free |
| Google Apps Script (inside the Sheet) | The shop manager | Checks stock, takes orders, verifies payments, makes invoices, publishes the website | Free |
| Razorpay (optional) | The card machine | Takes online payments and sends them to the owner's bank | Commission per sale, only if used |
| GitHub (private) | The storeroom | Stores the website files, product photos and catalogue | Free |
| Cloudflare Pages | The shop window | Shows the website to the world — fast, secure (https), worldwide | Free |
| Domain | The shop's address | e.g. www.priyasweets.in | Yearly fee |

- **Browsing never waits for the shop manager.** Product pages are plain files served by Cloudflare, so the shop is fast.
- **Money is exact to the paisa.** The server recalculates every bill itself and never trusts a total sent by the browser.
- **No email service.** Customers download their bill on screen; the owner's Gmail is only used for a few rare warnings.
- **GitHub Pages is never used** — GitHub's rules don't allow running a shop on it. GitHub only stores files; Cloudflare Pages publishes them.

---

## Build progress

The shop is built in seven phases. Each phase ends with "how to upload and test this phase".

| Phase | What it adds | Status |
|---|---|---|
| 0 | Fact checks, database layout, settings, setup menu, automatic jobs, Setup Guide steps 1–4 | ✅ Delivered |
| 1 | The customer website (read-only): design system, home, categories, product pages, search, cart, style guide, Setup Guide steps 6–8 | ✅ Delivered |
| 1.1 | v1.9 additions: full-width pages, look-and-feel choices, 6 fonts, Tamil, wording changes, "bought" counts, timed popups and announcements (docs/V1.9_ADDITIONS.md) | ✅ Delivered |
| 1.2–1.3 | Poster popups, home sections, menus | ✅ Delivered |
| 1.4 | Logo/favicon/tab names, banner timing, editable trust strip, any colours and gradients, footer builder, 6 photos per colour, 3 option types, Word-style descriptions, key features, grouped specifications, delivery wording, picture guide (docs/IMAGE_GUIDE.md) | ✅ Delivered |
| 1.5 | Cover picture (computer/tablet/phone versions, photo or finished design, shade, position, strength), Design preview at /preview/ (all settings, 4 screen sizes, light/dark, try pictures), private test copy on a preview branch | ✅ Delivered |
| 1.6 | Shop Studio (redesigned /preview/: 15 sections, Get Settings with Copy and Download, undo, product page try out, wording, languages), gradient themes and brand gradient, every word starting with a capital everywhere ("Add To Cart", switchable), big footer logo with a letter badge when no logo is uploaded, no long dashes anywhere | ✅ Delivered |
| 2 | Backend core + admin website shell: login, staff, products, photos, publishing, settings (including the v1.9 switches) | Next |
| 3 | Checkout and money: all payment options, orders, refunds, COD, requests, daily limit | — |
| 4 | Instant PDF invoices and the Bill Designer | — |
| 5 | Safety net: payment reconciliation, backups, archiving, alerts, reports, Quick Bill (POS), reviews | — |
| 6 | Proof: full self-tests, test plan, performance report, final audit | — |

---

## Complete file map

Marked by the phase that delivers each file. `client/` and the Google Sheet hold everything specific to one shop; everything else is "core" and can be replaced when a new version is shipped.

```
README.md                                   P0
VERSION                                     P0
package.json                                P0   (no dependencies at all)
test-vectors.json                           P3   (money, GST, rounding, words, pincode, coupon, UPI, QR vectors)
tools/build.mjs                             P1   (run by Cloudflare Pages; Node built-ins only)
tools/check-config.mjs                      P1
client/store.config.json                    P0   (white-label values, REPLACE_ME markers)
client/assets/…                             P1   (finished-looking SVG placeholders)

public/index.html 404.html offline.html manifest.webmanifest sw.js _headers _redirects robots.txt   P1
public/icons/sprite.svg                     P1
public/css/tokens.css base.css components.css layout.css pages.css                                P1
public/js/app.js router.js api.js state.js cart.js money.js validators.js search.js filters.js     P1
public/js/product.js seo.js a11y.js i18n.js pwa.js settings.js device.js share.js                  P1
public/js/legacy.js                         P1   (old-browser fallback)
public/js/ui/(dialog drawer toast gallery menu stepper breakpoints cart-drawer search-box quick-add inapp).js  P1
public/js/(color variants catalog html templates).js  public/js/pages/*.js                         P1
public/strings/en.json                      P1
public/styleguide.html  css/styleguide.css  js/styleguide.js   P1 → completed P6
public/pincode-states.json                  P1
public/js/checkout.js payment.js track.js checkout-options.js manual-pay.js upi.js qr.js resume.js P3
public/upi-apps.json                        P3

public/admin/index.html admin.css manifest.webmanifest                                            P2
public/admin/js/router.js api.js permissions.js drafts.js                                         P2
public/admin/js/alerts-live.js                                                                    P5
public/admin/js/csv.js sanitize.js          P2      public/admin/js/xlsx-writer.js   P5
public/admin/js/ui/…                        P2
public/admin/js/views/ dashboard products categories media users pages settings/(branding store
                       tax-shipping layout)                                                      P2
public/admin/js/views/ orders payment-verify request-editor coupons pincodes customers capacity
                       settings/(payments payee-details)                                         P3
public/admin/js/views/settings/invoice-designer.js                                                P4
public/admin/js/views/ pos reviews reports audit storage health                                   P5
public/tests.html                           P6

apps-script/appsscript.json                 P0
apps-script/Schema.gs Config.gs Util.gs Setup.gs Menu.gs Triggers.gs                              P0
apps-script/Api.gs Auth.gs Rbac.gs Audit.gs Products.gs Inventory.gs Media.gs Publish.gs          P2
apps-script/Holds.gs Capacity.gs Checkout.gs Razorpay.gs Orders.gs Tax.gs Coupons.gs Pincodes.gs  P3
apps-script/PaymentMethods.gs ManualPay.gs Requests.gs Payee.gs CustomerTrust.gs Contact.gs       P3
apps-script/Invoice.gs InvoiceDesign.gs                                                            P4
apps-script/Archive.gs Backup.gs Health.gs Alerts.gs Reports.gs Reviews.gs Pos.gs                 P5
apps-script/Tests.gs                                                                               P6

docs/ASSUMPTIONS_VERIFIED.md                P0 (updated every phase)
docs/DATA_FILES.md                          P1   (format of the files Publish writes and the build reads)
data/sample-catalog.json sample-pages.json  P1   (used until the first publish)
docs/SETUP_GUIDE.md                         P0 steps 1–4 → completed across phases
docs/API_CONTRACT.md                        P2 → completed P3
docs/ASSETS_NEEDED.md                       P1
docs/OWNER_MANUAL.md TROUBLESHOOTING.md CLIENT_ONBOARDING_CHECKLIST.md GO_LIVE_CHECKLIST.md        P5–P6
docs/TEST_PLAN.md PERFORMANCE_REPORT.md TRACEABILITY.md UPDATING_A_CLIENT.md UPGRADE_GUIDE.md      P6
```

Deliberately absent: any email-sending file (`Email.gs`, SMTP, Brevo, email templates). The only email ever sent is a rare owner warning through the owner's own Gmail (`Alerts.gs`).

---

## Apps Script paste order

Apps Script files are pasted into the Script Editor one by one (Setup Guide step 3). The editor name must match the file name without `.gs` (for example the file `Schema.gs` becomes a script file named `Schema`).

Phase 0 order: `appsscript.json` → `Schema` → `Config` → `Util` → `Setup` → `Menu` → `Triggers`.
Later phases add files to the end of this list; the guide says exactly which, each time.
