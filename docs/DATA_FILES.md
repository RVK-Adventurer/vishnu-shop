# Published data files (the contract between Apps Script and the website)

The admin's **Publish** (Phase 2, `apps-script/Publish.gs`) writes these files into the repository's `data/` folder. `tools/build.mjs` reads them to build the site. Until the first publish, the build uses `data/sample-catalog.json` and `data/sample-pages.json` instead.

All money is **whole paise** (₹1 = 100). All dates are ISO text.

## `data/catalog.json` — the light product list

```json
{
  "format": 1,
  "catalog_version": "content hash, changes whenever anything below changes",
  "generated_at": "2026-10-01T20:48:05.123+05:30",
  "categories": [
    { "id": "cat-sweets", "name": "Sweets & Snacks", "slug": "sweets-snacks", "parent_id": "", "image": "/assets/images/2026-10/cat-sweets-card.webp", "sort": 1, "active": true }
  ],
  "products": [
    {
      "id": "P0001", "slug": "kaju-katli", "name": "Kaju Katli", "short": "one-line description",
      "category_id": "cat-sweets", "tags": ["cashew"], "brand": "Sri Annapoorna Sweets", "gst_rate": 5,
      "rating_avg": 4.7, "rating_count": 214,
      "images": [ { "thumb": "/assets/images/2026-10/p0001-1-thumb.webp", "card": "…-card.webp", "full": "…-full.webp", "w": 1200, "h": 1200, "alt": "Kaju Katli box" } ],
      "option_names": ["Weight"],
      "variants": [
        { "sku": "P0001-1", "options": { "Weight": "250 g" }, "price": 32000, "mrp": 36000, "in_stock": true, "low_stock": false, "image": 0 }
      ],
      "created_at": "2026-09-01T10:00:00.000+05:30", "bestseller_rank": 1, "order_mode": "DEFAULT", "active": true
    }
  ]
}
```

- `images` in this file: at most the first 2 photos (for cards). All photos go in the detail file.
- `variants` never carry stock counts — only `in_stock` and `low_stock` (Section 8.6).
- `bestseller_rank`: 1 = best seller in the last 30 days (top 10 only; others `null`).
- `order_mode`: `DEFAULT` or `REQUEST_ONLY` (Section 7.14).
- A product the build can't use (bad slug, no variants, price not whole paise) is skipped and listed in the build log — it never stops the build.

## `data/products/<slug>.json` — details for one product

```json
{ "id": "P0001", "slug": "kaju-katli", "description_html": "<p>…</p>", "specs": [["Brand", "…"], ["HSN code", "1704"]],
  "images": [ { "thumb": "…", "card": "…", "full": "…", "w": 1200, "h": 1200, "alt": "…" } ],
  "seo_title": "", "seo_description": "" }
```

`description_html` is sanitized by the server on save and again by the build (allowed: p, br, strong, em, u, ul, ol, li, h2–h4, a, blockquote, tables).

## `data/settings.public.json`

The settings marked "pub" in `apps-script/Config.gs` (shop name, colours, contact details, layout, messages, shipping display values, COD limit for display…) plus:

```json
"payment_options": [ { "id": "RAZORPAY", "label": "UPI, Cards & Net Banking", "sub": ["upi", "card", "netbanking"] }, { "id": "COD", "label": "Cash on Delivery", "sub": [] } ]
```

Only display labels and order — never who may use which option (that is decided live by the server, Section 7.0.3) and never payee details.

## `data/pages.json`

```json
[ { "slug": "privacy-policy", "title": "Privacy policy", "html": "<p>…</p>", "show_in_footer": true, "is_template": false } ]
```

## `data/pincode-rules.json`

```json
{ "rules": [ { "mode": "ALLOW", "pattern": "641001-641999", "delivery_days": 2, "shipping_override_paise": null, "cod_allowed": true, "request_only": false } ] }
```

Used only for instant feedback on product pages; the server checks the same rules again at checkout (Section 7.2). No rules = deliver everywhere. Any matching BLOCK rule wins; if any ALLOW rule exists, a pincode must match one.

## Product photos

Committed by Publish to `public/assets/images/YYYY-MM/` (then `batch_02`, `batch_03`… after 500 files) so the build copies them as they are. File names never change once published, so browsers can keep them for a year.

## Files the build writes for the browser (in `dist/`)

`catalog.json`, `products/<slug>.json`, `settings.public.json`, `pages.json` (titles only), `pincode-rules.json`, `build.json`, `css/site.css` (bundled), `css/brand.css` (brand colours), `sw.js` (with the build id), `manifest.webmanifest`, `sitemap.xml`, `robots.txt`, `_headers`, and one HTML page per home / category / product / info page.
