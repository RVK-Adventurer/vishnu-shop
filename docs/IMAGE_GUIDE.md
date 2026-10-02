# Picture sizes that look right on every phone and computer

Follow this table and pictures fill their boxes with no empty bands and no cut-off parts. From Phase 2, the admin shows the same advice next to every upload button and shrinks large photos automatically, so you can upload straight from your phone.

| Picture | Best size (pixels) | Shape | File | Notes |
|---|---|---|---|---|
| **Product photo**, square shop (default) | **1200 × 1200** (at least 800 × 800) | 1 : 1 | JPG or WebP, under 500 KB | Most products: sweets, spices, kitchen items, electronics |
| **Product photo**, portrait shop | **1080 × 1350** | 4 : 5 | JPG or WebP | Clothing, sarees, kurtis, people wearing products. Set `"product_image_ratio": "PORTRAIT"` |
| **Product photo**, landscape shop | **1200 × 900** | 4 : 3 | JPG or WebP | Furniture, wide items. Set `"product_image_ratio": "LANDSCAPE"` |
| **Cover picture** — computer | **1920 × 640** | exactly **3 : 1** | JPG or WebP, under 600 KB | The big banner under the menu bar (`hero_cover_json`). A wrong shape is not used |
| **Cover picture** — tablet | **1536 × 768** | exactly **2 : 1** | under 450 KB | Optional |
| **Cover picture** — phone | **1080 × 1080** | exactly **1 : 1** | under 350 KB | Recommended. For a finished design with words, make all three |
| **Banner** (computer) | **1920 × 800** | about 12 : 5 | JPG or WebP, under 400 KB | Keep words and faces in the **middle 60%**. The edges are trimmed on narrow screens |
| **Banner** (phone version, optional) | **1080 × 1080** | 1 : 1 | JPG or WebP | Shown on phones instead of the computer banner (`image_mobile`) |
| **Category picture** | **600 × 600** | 1 : 1 | JPG or WebP | One clear product on a plain background |
| **Logo** | SVG, or PNG **480 × 120** | about 4 : 1 | Transparent background, under 300 KB | Height is set by `logo_height_px` (24–72 px on computers, at most 44 px on phones) |
| **Favicon** (browser-tab icon) | **512 × 512** | 1 : 1 (square!) | PNG or SVG, under 200 KB | Also used as the phone home-screen icon when it is a PNG |
| **Offer poster** (popup) | **1080 × 1350** | 4 : 5 | JPG, under 500 KB | Square 1080 × 1080 also works |
| **Link preview** (WhatsApp, Facebook) | **1200 × 630** | 1.91 : 1 | PNG or JPG | `seo.og_image` |

## Test before uploading

Open your shop's **/preview/** page, then click **Try a picture** next to the logo, tab icon or cover. The preview shows the picture on every screen size at once, with a ✓ or ⚠ line about its size and shape.

## Rules for product photos

1. **Use the same shape for all products.** Pick the shape once (square, portrait or landscape) and take every photo that way. A grid of the same shape looks professional.
2. **No blank space:** if your photos already match the shop's shape, set `"product_image_fit": "cover"` and every photo fills its box edge to edge. Keep `"contain"` (the default) if your photos come in mixed shapes. Nothing is ever cut off then, but plain bands may show.
3. **Plain, light background** (white or light grey). Put the product in the centre and leave a little space around it, about 5% on each side.
4. **First photo = the hero.** It is the one shown on product cards. Then add other angles, details (fabric, label), the product in use, and the size or what's in the box.
5. **Up to 6 photos per product.** For products with colours, each colour can have its own 6 photos. Choosing "Red" then shows the red photos.
6. Use daylight near a window. Don't use the flash, and don't zoom with the phone; move closer instead.

## Why these sizes

- 1200 pixels is sharp on the best phone screens (3× pixel density at about 400 px wide) and on large monitors in the zoom view. The shop also makes 320 and 640 pixel copies, so phones on mobile data download only the small one.
- 500 KB keeps a product page fast on a 4G connection in a small town.
