/**
 * seo.js — page titles, descriptions, social previews and structured data (Section 9.8, 10.9).
 * Used by the build for every pre-rendered page and by the browser for pages that change
 * after loading (search results).
 */

import { html, raw, esc, jsonForScript } from './html.js';
import { leadVariant, isInStock, productUrl, categoryUrl } from './templates.js';
import { paiseToDecimal } from './money.js';

/** Shortens text to `max` characters at a word boundary, adding "…". */
export function clip(text, max = 160) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

/** Removes HTML tags (for meta descriptions). */
export function stripTags(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function abs(siteUrl, path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return siteUrl.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Everything inside <head> that depends on the page.
 * opts: { title, description, path, image, type, noindex, jsonld: [objects], siteUrl, siteName }
 */
export function headTags(opts) {
  const url = abs(opts.siteUrl, opts.path || '/');
  const img = opts.image ? abs(opts.siteUrl, opts.image) : '';
  return html`<title>${opts.title}</title>
<meta name="description" content="${clip(opts.description, 160)}">
<link rel="canonical" href="${url}">
${(opts.alternates || []).map((a) => html`<link rel="alternate" hreflang="${a.hreflang}" href="${abs(opts.siteUrl, a.href)}">`)}
${opts.noindex ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<meta property="og:site_name" content="${opts.siteName}">
<meta property="og:type" content="${opts.type || 'website'}">
<meta property="og:title" content="${opts.title}">
<meta property="og:description" content="${clip(opts.description, 200)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${opts.ogLocale || 'en_IN'}">
${img ? html`<meta property="og:image" content="${img}">${opts.imageWidth ? html`<meta property="og:image:width" content="${opts.imageWidth}"><meta property="og:image:height" content="${opts.imageHeight}">` : ''}` : ''}
<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${opts.title}">
<meta name="twitter:description" content="${clip(opts.description, 200)}">
${img ? html`<meta name="twitter:image" content="${img}">` : ''}
${(opts.jsonld || []).map((obj) => html`<script type="application/ld+json">${jsonForScript(obj)}</script>`)}`;
}

export function organizationLd(s, siteUrl) {
  const out = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: s.business_name,
    url: abs(siteUrl, '/')
  };
  if (s.legal_name) out.legalName = s.legal_name;
  if (s.logo_path) out.logo = abs(siteUrl, s.logo_path);
  if (s.contact_phone) out.telephone = '+91' + s.contact_phone;
  if (s.contact_email) out.email = s.contact_email;
  const social = Object.values(s.social_json || {}).filter(Boolean);
  if (social.length) out.sameAs = social;
  if (s.address_line1) {
    out.address = {
      '@type': 'PostalAddress',
      streetAddress: [s.address_line1, s.address_line2].filter(Boolean).join(', '),
      addressLocality: s.city || undefined,
      addressRegion: s.state || undefined,
      postalCode: s.shop_pincode || undefined,
      addressCountry: 'IN'
    };
  }
  return out;
}

export function websiteLd(s, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: s.business_name,
    url: abs(siteUrl, '/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs(siteUrl, '/search/?q={search_term_string}') },
      'query-input': 'required name=search_term_string'
    }
  };
}

export function breadcrumbLd(items, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => {
      const el = { '@type': 'ListItem', position: i + 1, name: it.name };
      if (it.href) el.item = abs(siteUrl, it.href);
      return el;
    })
  };
}

/** Product + Offer (+ AggregateRating when reviews are on and there are some). */
export function productLd(p, detail, s, siteUrl, category) {
  const lead = leadVariant(p);
  const images = ((detail && detail.images) || p.images || []).map((im) => abs(siteUrl, im.full || im.card)).filter(Boolean);
  const out = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    url: abs(siteUrl, productUrl(p)),
    sku: lead ? lead.sku : undefined,
    image: images.length ? images : undefined,
    description: clip(stripTags((detail && detail.description_html) || p.short || p.name), 500),
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    category: category ? category.name : undefined
  };
  const prices = (p.variants || []).map((v) => v.price);
  const availability = isInStock(p) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  if (prices.length > 1 && Math.min(...prices) !== Math.max(...prices)) {
    out.offers = {
      '@type': 'AggregateOffer', priceCurrency: 'INR',
      lowPrice: paiseToDecimal(Math.min(...prices)), highPrice: paiseToDecimal(Math.max(...prices)),
      offerCount: prices.length, availability
    };
  } else if (lead) {
    out.offers = {
      '@type': 'Offer', priceCurrency: 'INR', price: paiseToDecimal(lead.price), availability,
      url: abs(siteUrl, productUrl(p)),
      seller: { '@type': 'Organization', name: s.business_name }
    };
  }
  if (s.reviews_enabled && p.rating_count > 0) {
    out.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(p.rating_avg).toFixed(1), reviewCount: p.rating_count };
  }
  return JSON.parse(JSON.stringify(out));
}

export function itemListLd(products, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.slice(0, 24).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(siteUrl, productUrl(p)) }))
  };
}

export { categoryUrl, esc };

/** Browser only: update the title and description after the page changes (e.g. search). */
export function setPageMeta(title, description) {
  if (typeof document === 'undefined') return;
  document.title = title;
  const m = document.querySelector('meta[name="description"]');
  if (m && description) m.setAttribute('content', clip(description, 160));
}
