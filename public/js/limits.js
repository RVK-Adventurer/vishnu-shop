/**
 * limits.js — the fixed maximums for everything the owner can set. ONE list, shared by the build
 * (which trims anything over the limit and says so in the build log), the admin screens (which
 * show "up to N" next to each field and stop at the limit) and the docs.
 *
 * Why limits at all: they keep every page fast on a cheap phone, keep the free Cloudflare /
 * GitHub / Sheets quotas safe, and stop a layout from being stretched until it breaks.
 */

export const LIMITS = {
  // Logo and tab names
  logo_height_px: { min: 24, max: 72, default: 40 },   // header logo height on computers (phones use at most 44 px)
  logo_max_width_px: 240,                               // a very wide logo is scaled down to this width
  logo_file_kb: 300,
  favicon_min_px: 48,                                   // best: a square 512 × 512 PNG or an SVG
  favicon_file_kb: 200,
  tab_title_chars: 60,                                  // Google shows about 60 characters

  // Banners
  banners: 6,

  // Trust strip (the row of reasons to buy)
  trust_items: 6,
  trust_text_chars: 40,

  // Products
  product_photos: 6,                                    // photos per product (or per colour, see below)
  photo_sets: 12,                                       // colours that can each have their own set of photos
  photos_total: 60,                                     // all photos of one product together
  option_types: 3,                                      // e.g. Colour + Size + Material
  option_values: 20,                                    // e.g. up to 20 colours
  variants: 100,                                        // combinations (SKUs) per product
  highlights: 8,                                        // "Key features" bullet points
  highlight_chars: 120,
  spec_groups: 8,
  spec_rows: 40,
  description_chars: 20000,

  // Footer
  footer_columns: 4,                                    // the owner's own link columns
  footer_links: 8,                                      // links per column
  footer_text_chars: 300,

  // Text
  delivery_text_chars: 80
};

/** Keeps a number inside a limit like LIMITS.logo_height_px. */
export function clampTo(limit, value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return limit.default;
  return Math.max(limit.min, Math.min(limit.max, n));
}
