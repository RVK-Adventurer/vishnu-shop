# Pictures and files each shop needs

Every picture below has a finished-looking placeholder already, so the shop looks complete before the owner sends anything. Replace them one by one as the real pictures arrive.

**How to replace a file:** on GitHub open the folder → **Add file** → **Upload files** → drag in the new file with **exactly the same name** → **Commit changes**. Cloudflare rebuilds in 1–2 minutes. (Photos of products and banners are uploaded from the admin website instead — they don't go here.)

## Brand files (folder `client/assets/`)

| File name | Size | What it is | Tips |
|---|---|---|---|
| `logo.svg` (or `logo.png`) | about 320 × 80 px, transparent background | Logo in the header | Wide logos work best. Then set `"logo": "client/assets/logo.svg"` in `client/store.config.json`. With no logo the shop name is shown as text — this looks clean too. |
| `favicon.svg` | square, simple | Small icon in the browser tab | A single letter or symbol on the brand colour. |
| `favicon-32.png` | 32 × 32 px | Tab icon for older browsers | |
| `apple-touch-icon.png` | 180 × 180 px, no transparency | Icon when an iPhone user adds the shop to the home screen | Fill the whole square with the brand colour. |
| `icon-192.png` | 192 × 192 px | App icon (Android) | |
| `icon-512.png` | 512 × 512 px | App icon, large | |
| `icon-maskable-512.png` | 512 × 512 px, logo inside the middle 80% | App icon that Android may crop to a circle | Keep the logo away from the edges. |
| `og-default.png` | **1200 × 630 px**, JPG or PNG under 300 KB | The picture shown when the shop's link is shared on WhatsApp, Facebook, etc. | Shop name + a nice product photo. Must be PNG or JPG — WhatsApp ignores SVG. |

## Uploaded from the admin website (Phase 2)

| Picture | Size | Where |
|---|---|---|
| Product photos | Any phone photo; the admin shrinks it automatically to 320 / 640 / 1200 px WebP under 500 KB | Products → edit → Images |
| Home banners (1 to 3) | 1600 × 900 px landscape; optional 800 × 1000 px portrait version for phones | Settings → Branding → Home banners (with a focal point) |
| Category pictures | Square, at least 480 × 480 px | Categories |
| Signature on bills (optional) | PNG with transparent background, about 400 × 120 px | Settings → Bill design |
| Static UPI QR from the bank (optional) | PNG or JPG | Settings → How you get paid → Payee details |

## Theme colours (for `client/store.config.json`)

Pick a preset and copy its three colours (text on these colours is already checked for readability):

| `theme_preset` | `primary_color` | `secondary_color` | `accent_color` | Good for |
|---|---|---|---|---|
| `ROYAL_INDIGO` | `#4338CA` | `#0F766E` | `#F59E0B` | Any shop |
| `FRESH_GREEN` | `#15803D` | `#0E7490` | `#FACC15` | Grocery, kirana, organic, plants |
| `SAFFRON` | `#C2410C` | `#7C2D12` | `#FBBF24` | Sweets, snacks, puja items, spices |
| `ROSE` | `#BE185D` | `#6D28D9` | `#FDE68A` | Fashion, sarees, beauty, gifts |
| `OCEAN` | `#0369A1` | `#1E3A8A` | `#FCD34D` | Electronics, mobiles, stationery |
| `CHARCOAL_GOLD` | `#1F2937` | `#78350F` | `#D4A017` | Jewellery, premium, handloom |

To preview them all, open `/styleguide.html` on the shop and use the **Theme** menu.

## Taking good product photos with a phone (for the owner)

1. Put the product on a plain white or light sheet, near a window in daylight. No flash.
2. Hold the phone straight; fill most of the square with the product.
3. One photo per angle: front, back or side, a close-up of the detail, and one "in use".
4. Wipe the phone camera lens first.
