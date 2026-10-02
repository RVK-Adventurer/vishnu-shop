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
    { "id": "cat-sweets", "name": "Sweets & Snacks", "slug": "sweets-snacks", "parent_id": "", "image": "/assets/images/2026-10/cat-sweets-card.webp", "sort": 1, "active": true, "show_in_menu": true }
  ],
  "products": [
    {
      "id": "P0001", "slug": "kaju-katli", "name": "Kaju Katli", "short": "one-line description",
      "category_id": "cat-sweets", "tags": ["cashew"], "brand": "Sri Annapoorna Sweets", "gst_rate": 5,
      "rating_avg": 4.7, "rating_count": 214,
      "images": [ { "thumb": "/assets/images/2026-10/p0001-1-thumb.webp", "card": "…-card.webp", "full": "…-full.webp", "w": 1200, "h": 1200, "alt": "Kaju Katli box" } ],
      "option_names": ["Weight"],
      "variants": [
        { "sku": "P0001-1", "options": { "Weight": "250 g" }, "price": 32000, "mrp": 36000, "in_stock": true, "low_stock": false, "image": 0, "images": [0, 1, 2] }
      ],
      "swatches": { "Colour": { "Mango Yellow": "#F2B705" } },
      "created_at": "2026-09-01T10:00:00.000+05:30", "bestseller_rank": 1, "order_mode": "DEFAULT", "active": true
    }
  ]
}
```

- `images` in this file: at most the first 2 photos (for cards). All photos go in the detail file.
- `variants` never carry stock counts — only `in_stock` and `low_stock` (Section 8.6).
- `bestseller_rank`: 1 = best seller in the last 30 days (top 10 only; others `null`).
- `order_mode`: `DEFAULT` or `REQUEST_ONLY` (Section 7.14).
- Options (1.4): up to **3** `option_names` (e.g. `["Colour", "Size"]`), up to **20** values each, up to **100** variants. Over the limit, the extras are left out and the build log says so.
- Variant `images` (optional, 1.4): positions in the detail file's `images` list that belong to this variant — up to **6**. Usually every variant of the same colour has the same list. Choosing that colour shows those photos. `image` is the photo the gallery jumps to.
- `swatches` (optional): exact swatch colours for colour names the shop doesn't know (colour codes only).
- Category `show_in_menu` (default `true`): `false` keeps the category page and its products but leaves it out of the header bar, phone menu and home category tiles. `active: false` hides the category completely.
- A product the build can't use (bad slug, no variants, price not whole paise) is skipped and listed in the build log — it never stops the build.

## `data/products/<slug>.json` — details for one product

```json
{ "id": "P0001", "slug": "kaju-katli", "description_html": "<p>…</p>",
  "highlights": ["Made fresh every morning", "No added colours"],
  "specs": [ { "group": "General", "rows": [["Brand", "…"], ["Weight", "250 g"]] }, { "group": "Tax", "rows": [["HSN code", "1704"]] } ],
  "images": [ { "thumb": "…", "card": "…", "full": "…", "w": 1200, "h": 1200, "alt": "…" } ],
  "gallery": [0, 1, 2, 3],
  "seo_title": "", "seo_description": "" }
```

- `description_html`: cleaned by the server on save and again by the build (`public/js/html.js`). Allowed: paragraphs, headings (h2–h4), bold, italic, underline, strike, highlight, sub/superscript, lists, links, quotes, lines, tables (with merged cells and captions), boxes, code, the shop's own pictures, and the `rt-…` formatting classes (alignment, size, line and paragraph spacing, indent, colours, highlights, table styles, tick lists, note/warning boxes, two columns). Up to 20,000 characters.
- `highlights` (1.4): up to 8 "Key features", 120 characters each.
- `specs`: either a simple list `[["Brand", "…"], …]` or groups `[{ "group": "…", "rows": [...] }]`. Up to 8 groups and 40 rows.
- `images`: every photo of the product, up to 60 (6 per colour). `gallery` (optional): the main set of up to 6 photos, used when the chosen variant has no photos of its own (default: the first 6).

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
