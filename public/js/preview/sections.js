/**
 * preview/sections.js: what each Shop Studio section contains, in the order an owner usually works.
 * Each section lists the settings it changes (for the "changed" dots and the Checks list) and draws
 * its controls with the builders in controls.js. Every label is in Capital Case, as the owner asked.
 */

import { html, raw } from '../html.js';
import { THEME_PRESETS } from '../color.js';
import { LIMITS } from '../limits.js';
import { COVER_SPEC } from '../cover.js';
import { HOME_SECTIONS, HOME_SECTIONS_DEFAULT, FOOTER_SECTIONS } from '../templates.js';
import { GRADIENT_THEMES } from './controls.js';

const art = (cls, inner = '') => raw(`<span class="art ${cls}">${inner}</span>`);
const coverSize = (k) => `${COVER_SPEC[k].best[0]} × ${COVER_SPEC[k].best[1]}`;
const coverHint = (k) => `Exactly ${COVER_SPEC[k].ratioText} shape, best ${coverSize(k)} pixels (at least ${COVER_SPEC[k].min[0]} × ${COVER_SPEC[k].min[1]}), under ${COVER_SPEC[k].kb} KB.`;

export const SECTION_NAMES = {
  banner: 'Banner Or Cover Picture', trust: 'Trust Strip', categories: 'Shop By Category', pinned: 'Your Own Product Rows',
  bestsellers: 'Bestsellers', new_arrivals: 'New Arrivals', deals: 'Deals', recently_viewed: 'Recently Viewed', all_products: 'All Products With Filters'
};
const FOOTER_NAMES = { about: 'About', care: 'Customer Care', policies: 'Policies', payments: 'We Accept (Payments)' };

/** Friendly names for the Checks list ("what you changed"). */
export const KEY_NAMES = {
  theme_preset: 'Quick Theme', primary_color: 'Main Colour', secondary_color: 'Second Colour', accent_color: 'Accent Colour',
  brand_gradient: 'Brand Gradient', brand_gradient_areas: 'Where The Gradient Is Used', header_bg: 'Top Bar Colour', catbar_bg: 'Category Bar Colour',
  announcement_bg: 'Announcement Bar Colour', footer_bg: 'Footer Colour', hero_bg: 'Welcome Banner Colour', button_bg: 'Button Colour', page_bg: 'Page Background',
  logo_path: 'Logo', logo_mode: 'Logo Or Name', logo_height_px: 'Logo Height', favicon_path: 'Tab Icon', tab_title_format: 'Tab Names', tab_title_home: 'Home Tab Name',
  footer_show_logo: 'Footer Logo', footer_logo_height_px: 'Footer Logo Size', hero_cover_json: 'Cover Picture', hero_banners_json: 'Banners', hero_autorotate: 'Banner Auto Slide',
  banner_frequency: 'How Often The Banner Shows', banner_start: 'Which Banner Comes First', home_layout: 'Home Page Style', home_sections_json: 'Home Page Sections',
  show_category_menu: 'Categories In Menus', show_all_products_link: 'All Products Link', announcement_text: 'Announcement Text', announcement_auto: 'Automatic Announcement',
  announcement_starts_at: 'Announcement Start', announcement_ends_at: 'Announcement End', trust_strip_json: 'Trust Strip Items', show_trust_strip: 'Trust Strip On Or Off',
  page_width: 'Page Width', ui_corners: 'Corners', ui_shadows: 'Shadows', ui_spacing: 'Spacing', ui_text_size: 'Text Size', ui_text_case: 'Text Style',
  font_body: 'Font', font_heading: 'Heading Font', product_image_ratio: 'Photo Shape', product_image_fit: 'Photo Fit', reviews_enabled: 'Star Ratings',
  sold_counts_mode: 'Bought Counts', sold_counts_min: 'Bought Counts Minimum', delivery_display: 'Delivery On Product Pages', delivery_custom_text: 'Delivery Sentence',
  footer_sections_json: 'Footer Columns', footer_columns_json: 'Your Footer Links', footer_about_text: 'Footer About Text', footer_show_contact: 'Footer Contact Details',
  footer_show_social: 'Footer Social Icons', footer_show_hours: 'Footer Opening Hours', footer_copyright_text: 'Copyright Line', footer_text: 'Footer Small Note',
  popups_json: 'Offer Pop Ups', text_overrides_json: 'Shop Wording', languages_json: 'Languages', default_language: 'Main Language', home_pinned_rows_json: 'Your Own Product Rows'
};

/* Little drawings inside the choice tiles (pure CSS, see preview.css "Tile art"). */
const ART = {
  corner: (r) => art('art-corner art-corner--' + r, '<i></i>'),
  shadow: (s) => art('art-shadow art-shadow--' + s, '<i></i>'),
  spacing: (s) => art('art-spacing art-spacing--' + s, '<i></i><i></i><i></i>'),
  size: (s) => art('art-size art-size--' + s, 'Aa'),
  width: (w) => art('art-width art-width--' + w, '<i></i>'),
  ratio: (r) => art('art-ratio art-ratio--' + r, '<i></i>'),
  fit: (f) => art('art-fit art-fit--' + f, '<i></i>'),
  logo: (m) => art('art-logo art-logo--' + m, '<i></i><b></b>'),
  layout: (l) => art('art-layout art-layout--' + l, '<i></i><i></i><i></i><i></i>'),
  align: (a) => art('art-align art-align--' + a, '<i></i><i></i><i></i>'),
  valign: (a) => art('art-valign art-valign--' + a, '<i></i>'),
  overlay: (o) => art('art-overlay art-overlay--' + o, '<i></i>'),
  cover: (c) => art('art-cover art-cover--' + c, '<i></i><b></b>'),
  case: (c) => art('art-case', c === 'TITLE' ? 'Add To Cart' : 'Add to cart'),
  delivery: (d) => art('art-delivery', d),
  freq: (f) => art('art-freq', f)
};

export function buildSections({ fonts = [], icons = [] } = {}) {
  const fontTiles = [{ value: 'system', label: 'Phone’s Own Font', art: art('art-font', 'Aa') }]
    .concat(fonts.map((fnt) => ({ value: fnt.id, label: fnt.name, art: raw(`<span class="art art-font" data-font="'Studio ${fnt.name}', ${fnt.fallback || 'sans-serif'}">Aa</span>`) })));

  return [
    {
      id: 'colours', title: 'Colours And Gradient', icon: 'palette',
      intro: 'Pick your shop’s colours. Any colour works, and the shop keeps every word readable on it.',
      keys: ['theme_preset', 'primary_color', 'secondary_color', 'accent_color', 'brand_gradient', 'brand_gradient_areas'],
      render: (f) => html`
        ${f.group('Gradient Themes', html`<div class="st-themes">${GRADIENT_THEMES.map((g, i) => html`<button type="button" class="st-theme" data-gtheme="${i}"><span class="st-theme__bar" data-paint-swatch="${g.gradient}"></span><span class="st-theme__name">${g.name}</span></button>`)}</div>`, 'One tap sets matching colours and a brand gradient on the top bar, buttons and welcome banner.')}
        ${f.group('Simple Themes', html`<div class="st-themes">${Object.entries(THEME_PRESETS).map(([k, p]) => html`<button type="button" class="st-theme" data-ptheme="${k}"><span class="st-theme__dots"><i data-swatch="${p.primary}"></i><i data-swatch="${p.secondary}"></i><i data-swatch="${p.accent}"></i></span><span class="st-theme__name">${p.name}</span><span class="st-theme__for">${p.goodFor}</span></button>`)}</div>`)}
        ${f.group('Your Colours', html`<div class="st-grid-3">${f.color('primary_color', 'Main Colour', { def: '#4338CA' })}${f.color('secondary_color', 'Second Colour', { def: '#0F766E' })}${f.color('accent_color', 'Accent Colour', { def: '#F59E0B' })}</div>`, 'Main colour: buttons and links. Accent: offers and highlights.')}
        ${f.group('Brand Gradient', html`${f.paint('brand_gradient', 'Gradient', { allowTheme: true, themeLabel: 'No Gradient' })}
          ${f.chips('brand_gradient_areas', 'Use The Gradient On', [['header', 'Top Bar'], ['catbar', 'Category Bar'], ['announcement', 'Announcement Bar'], ['buttons', 'Main Buttons'], ['hero', 'Welcome Banner'], ['footer', 'Footer']])}
          ${f.note('An area with its own colour in Area colours keeps that colour.')}`)}`
    },
    {
      id: 'areas', title: 'Area Colours', icon: 'layout',
      intro: 'Give any part of the shop its own colour or gradient. Theme colour keeps it matching your brand.',
      keys: ['header_bg', 'catbar_bg', 'announcement_bg', 'button_bg', 'hero_bg', 'footer_bg', 'page_bg'],
      render: (f) => html`
        ${f.group('Top Of The Page', html`${f.paint('announcement_bg', 'Announcement Bar (Very Top)')}${f.paint('header_bg', 'Top Bar (Logo, Search, Cart)')}${f.paint('catbar_bg', 'Category Bar')}`)}
        ${f.group('Page', html`${f.paint('hero_bg', 'Welcome Banner (When There Is No Picture)')}${f.paint('button_bg', 'Main Buttons')}${f.paint('page_bg', 'Page Background', { hint: 'Light colours only, so text stays easy to read.' })}`)}
        ${f.group('Bottom Of The Page', f.paint('footer_bg', 'Footer'))}`
    },
    {
      id: 'logo', title: 'Logo And Tab', icon: 'store',
      intro: 'Your logo in the top bar and the footer, the small icon in the browser tab, and the tab names.',
      keys: ['logo_path', 'logo_mode', 'logo_height_px', 'footer_show_logo', 'footer_logo_height_px', 'favicon_path', 'tab_title_format', 'tab_title_home'],
      render: (f, ctx) => html`
        ${f.group('Logo', html`${(ctx.draft.logo_path ? '' : f.note('No logo picture yet, so the shop shows a letter badge made from your shop name (for example “DS” for Demo Shop) in the top bar and the footer.'))}${f.image('logo_path', 'Logo Picture', { slot: 'logo', shape: '4 / 1', size: '480 × 120', svg: true, hint: `SVG, or a PNG about 480 × 120 pixels with a clear background. Under ${LIMITS.logo_file_kb} KB.` })}
          ${f.tiles('logo_mode', 'Show In The Top Bar', [{ value: 'LOGO_AND_NAME', label: 'Logo And Name', art: ART.logo('both') }, { value: 'LOGO_ONLY', label: 'Logo Only', art: ART.logo('logo') }, { value: 'NAME_ONLY', label: 'Name Only', art: ART.logo('name') }], { def: 'LOGO_AND_NAME' })}
          ${f.range('logo_height_px', 'Logo Height On Computers', { min: LIMITS.logo_height_px.min, max: LIMITS.logo_height_px.max, step: 2, unit: ' px', def: LIMITS.logo_height_px.default, hint: `Allowed ${LIMITS.logo_height_px.min} to ${LIMITS.logo_height_px.max} pixels. Phones always use at most 44 pixels.` })}`)}
        ${f.group('Footer Logo', html`${f.switch('footer_show_logo', 'Show The Logo In The Footer', { def: true })}
          ${f.range('footer_logo_height_px', 'Footer Logo Size', { min: LIMITS.footer_logo_height_px.min, max: LIMITS.footer_logo_height_px.max, step: 4, unit: ' px', def: LIMITS.footer_logo_height_px.default, hint: `Allowed ${LIMITS.footer_logo_height_px.min} to ${LIMITS.footer_logo_height_px.max} pixels (phones use at most 88).` })}`)}
        ${f.group('Browser Tab', html`${f.image('favicon_path', 'Tab Icon', { slot: 'favicon', shape: '1 / 1', size: '512 × 512', svg: true, hint: `Square PNG, 512 × 512 pixels (or SVG), under ${LIMITS.favicon_file_kb} KB.` })}
          ${f.text('tab_title_format', 'Tab Name Of Every Page', { max: LIMITS.tab_title_chars, placeholder: '{page} | {shop}', hint: '{page} is the page’s name and must stay. {shop} is your shop name.' })}
          ${f.text('tab_title_home', 'Tab Name Of The Home Page', { max: 70, placeholder: 'Raj Sweets | Fresh Sweets In Coimbatore' })}`)}`
    },
    {
      id: 'cover', title: 'Cover Picture', icon: 'image',
      intro: 'The big picture under the menu bar. Each screen size gets its own version, so it always fits perfectly.',
      keys: ['hero_cover_json'],
      render: (f, ctx) => {
        const mode = (ctx.draft.hero_cover_json || {}).mode || '';
        return html`
        ${f.tiles('hero_cover_json.mode', 'Type Of Cover', [{ value: '', label: 'No Picture', art: ART.cover('none') }, { value: 'PHOTO', label: 'Photo With My Words', art: ART.cover('photo') }, { value: 'ARTWORK', label: 'Finished Design', art: ART.cover('art') }], { def: '' })}
        ${mode ? html`
          ${f.group('Pictures', html`
            ${f.image('hero_cover_json.desktop', 'Computer (Required)', { slot: 'desktop', shape: '3 / 1', size: coverSize('desktop'), hint: coverHint('desktop') })}
            ${f.image('hero_cover_json.tablet', 'Tablet (Optional)', { slot: 'tablet', shape: '2 / 1', size: coverSize('tablet'), hint: coverHint('tablet') })}
            ${f.image('hero_cover_json.mobile', 'Phone (Recommended)', { slot: 'mobile', shape: '1 / 1', size: coverSize('mobile'), hint: coverHint('mobile') })}
            ${f.text('hero_cover_json.alt', 'Describe The Picture', { max: 200, placeholder: mode === 'ARTWORK' ? 'Diwali Sweet Fest, 20% Off' : 'Sweets On A Brass Plate', hint: mode === 'ARTWORK' ? 'Type the words written in your design, so Google and blind visitors can read them.' : 'A few words about the photo.' })}`, 'A picture with the wrong shape is not used, so the banner never looks stretched or badly cut.')}
          ${f.group('Picture Look', html`
            ${f.range('hero_cover_json.image_opacity', 'Picture Strength', { min: 20, max: 100, step: 5, unit: '%', def: 100, hint: 'Lower lets the colour behind show through.' })}
            ${f.paint('hero_cover_json.background', 'Colour Behind The Picture', { themeLabel: 'Theme Colour' })}`)}
          ${mode === 'PHOTO' ? html`
            ${f.group('Shade Over The Photo', html`
              ${f.paint('hero_cover_json.overlay', 'Shade Colour', { allowTheme: false, def: '#000000' })}
              ${f.range('hero_cover_json.overlay_opacity', 'Shade Strength', { min: 0, max: 80, step: 5, unit: '%', def: 35, hint: '30 to 45% keeps white words easy to read on any photo.' })}
              ${f.tiles('hero_cover_json.overlay_style', 'Shade Covers', [{ value: 'FULL', label: 'Whole Picture', art: ART.overlay('full') }, { value: 'SIDE', label: 'Fades From Words', art: ART.overlay('side') }, { value: 'BOTTOM', label: 'Fades From Bottom', art: ART.overlay('bottom') }], { def: 'FULL' })}`)}
            ${f.group('Words On The Photo', html`
              ${f.text('hero_cover_json.eyebrow', 'Small Line Above', { max: 40, placeholder: 'Welcome To' })}
              ${f.text('hero_cover_json.title', 'Big Title', { max: 80, placeholder: '(Your shop name)' })}
              ${f.text('hero_cover_json.subtitle', 'Line Under The Title', { max: 160, placeholder: '(Your tagline)' })}
              <div class="st-grid-2">${f.text('hero_cover_json.button_text', 'Button Words', { max: 30, placeholder: 'Shop Now' })}${f.text('hero_cover_json.button_link', 'Button Opens', { max: 300, placeholder: '/c/sweets-snacks/' })}</div>
              ${f.switch('hero_cover_json.show_eyebrow', 'Show The Small Line', { def: true })}${f.switch('hero_cover_json.show_subtitle', 'Show The Line Under The Title', { def: true })}${f.switch('hero_cover_json.show_button', 'Show The Button', { def: true })}
              ${f.tiles('hero_cover_json.text_align', 'Words Left Or Right', [{ value: 'LEFT', label: 'Left', art: ART.align('left') }, { value: 'CENTER', label: 'Centre', art: ART.align('center') }, { value: 'RIGHT', label: 'Right', art: ART.align('right') }], { def: 'LEFT' })}
              ${f.tiles('hero_cover_json.text_valign', 'Words Up Or Down', [{ value: 'TOP', label: 'Top', art: ART.valign('top') }, { value: 'MIDDLE', label: 'Middle', art: ART.valign('middle') }, { value: 'BOTTOM', label: 'Bottom', art: ART.valign('bottom') }], { def: 'MIDDLE' })}
              ${f.tiles('hero_cover_json.text_color', 'Word Colour', [{ value: 'AUTO', label: 'Automatic' }, { value: 'LIGHT', label: 'White' }, { value: 'DARK', label: 'Dark' }], { def: 'AUTO' })}`)}
            ${f.group('Keep This Part Visible', html`${f.range('hero_cover_json.focal_x', 'Left To Right', { min: 0, max: 100, step: 5, unit: '%', def: 50 })}${f.range('hero_cover_json.focal_y', 'Top To Bottom', { min: 0, max: 100, step: 5, unit: '%', def: 50 })}`, 'When a screen trims the photo, this point stays in view (for example, a face).')}`
          : f.group('Tapping The Picture', f.text('hero_cover_json.link', 'Opens This Page', { max: 300, placeholder: '/c/sweets-snacks/', hint: 'Leave empty if tapping should do nothing.' }))}` : f.note('Choose “Photo with my words” or “Finished design” to add your own cover picture. Without one, the shop shows a colour welcome banner.')}`;
      }
    },
    {
      id: 'banners', title: 'Banners', icon: 'calendar',
      intro: 'Sliding photo banners with your own words and dates. They show instead of the cover picture while they run.',
      keys: ['hero_banners_json', 'hero_autorotate', 'banner_frequency', 'banner_start'],
      render: (f) => html`
        ${f.group('Timing', html`
          ${f.tiles('banner_frequency', 'Show The Banner', [{ value: 'ALWAYS', label: 'Every Visit', art: ART.freq('∞') }, { value: 'SESSION', label: 'Once Per Visit', art: ART.freq('1×') }, { value: 'DAY', label: 'Once A Day', art: ART.freq('1/d') }], { def: 'ALWAYS' })}
          ${f.tiles('banner_start', 'With Several Banners, Start At', [{ value: 'FIRST', label: 'Banner 1' }, { value: 'RANDOM', label: 'A Random One' }, { value: 'NEXT', label: 'The Next One' }], { def: 'FIRST' })}
          ${f.switch('hero_autorotate', 'Slide To The Next Banner By Itself', { def: false, hint: 'Every 6 seconds; it stops when the customer touches it.' })}
          ${f.note('These timings also apply to the cover picture. Move “Banner or cover picture” in Home page to change where it appears.')}`)}
        ${f.list('hero_banners_json', {
          label: 'Banners', max: LIMITS.banners, addLabel: 'Add A Banner', empty: 'No banners yet. Your cover picture or colour welcome banner shows instead.',
          title: (b, i) => b.headline || `Banner ${i + 1}`,
          body: (p) => html`
            ${f.image(p + '.image', 'Computer Picture', { slot: 'banner', shape: '12 / 5', size: '1920 × 800', hint: 'Keep words and faces in the middle 60%; the edges are trimmed on narrow screens.' })}
            ${f.image(p + '.image_mobile', 'Phone Picture (Optional)', { slot: 'mobile', shape: '1 / 1', size: '1080 × 1080' })}
            ${f.text(p + '.alt', 'Describe The Picture', { max: 160 })}
            ${f.text(p + '.headline', 'Headline', { max: 80 })}${f.text(p + '.subline', 'Line Under It', { max: 160 })}
            <div class="st-grid-2">${f.text(p + '.cta_text', 'Button Words', { max: 30 })}${f.text(p + '.cta_link', 'Button Opens', { max: 300, placeholder: '/c/sweets-snacks/' })}</div>
            <div class="st-grid-2">${f.datetime(p + '.starts_at', 'Starts')}${f.datetime(p + '.ends_at', 'Ends')}</div>
            <div class="st-grid-2">${f.range(p + '.focal_x', 'Keep Visible: Left To Right', { min: 0, max: 100, step: 5, unit: '%', def: 50 })}${f.range(p + '.focal_y', 'Keep Visible: Top To Bottom', { min: 0, max: 100, step: 5, unit: '%', def: 50 })}</div>`
        })}`
    },
    {
      id: 'home', title: 'Home Page', icon: 'home',
      intro: 'Which sections the home page shows, in which order, and the announcement bar.',
      keys: ['home_layout', 'home_sections_json', 'show_category_menu', 'show_all_products_link', 'announcement_text', 'announcement_auto', 'announcement_starts_at', 'announcement_ends_at'],
      render: (f) => html`
        ${f.tiles('home_layout', 'Home Page Style', [{ value: 'A', label: 'Sections', art: ART.layout('a') }, { value: 'B', label: 'All Products On One Page', art: ART.layout('b') }], { def: 'A', cols: 2 })}
        ${f.group('Sections', f.order('home_sections_json', 'Tick To Show, Arrows To Reorder', { all: HOME_SECTIONS, names: SECTION_NAMES, def: HOME_SECTIONS_DEFAULT }), 'Product rows appear only when at least 4 products fit them.')}
        ${f.group('Menus', html`${f.switch('show_category_menu', 'Show Categories In The Menu Bar And Tiles', { def: true })}${f.switch('show_all_products_link', 'Show “All Products” In The Menu Bar', { def: true })}`)}
        ${f.group('Announcement Bar', html`${f.text('announcement_text', 'Your Own Message', { max: 140, placeholder: 'Free Delivery Above ₹499 This Week' })}
          ${f.switch('announcement_auto', 'When Empty, Make A Message From My Delivery Settings', { def: true })}
          <div class="st-grid-2">${f.datetime('announcement_starts_at', 'Starts')}${f.datetime('announcement_ends_at', 'Ends')}</div>`)}`
    },
    {
      id: 'trust', title: 'Trust Strip', icon: 'shield',
      intro: 'The row of reasons to buy from you, under the banner.',
      keys: ['show_trust_strip', 'trust_strip_json'],
      render: (f, ctx) => html`
        ${f.switch('show_trust_strip', 'Show The Trust Strip', { def: true })}
        ${f.list('trust_strip_json', {
          label: 'Items', max: LIMITS.trust_items, addLabel: 'Add An Item', empty: 'No items yet, so the shop makes the strip from your settings (secure payments, Cash on Delivery, returns, delivery days).',
          title: (it) => it.text || 'New Item',
          body: (p) => html`<div class="st-grid-icon">${f.select(p + '.icon', 'Icon', (ctx.icons.length ? ctx.icons : ['check']).map((nm) => [nm, nm]), { def: 'check' })}<span class="st-icon-preview" data-icon-preview="${p}.icon"></span></div>
            ${f.text(p + '.text', 'Words', { max: LIMITS.trust_text_chars, placeholder: 'Free Delivery Over ₹499' })}
            ${f.text(p + '.link', 'Opens (Optional)', { max: 300, placeholder: '/pages/refund-policy/' })}`
        })}`
    },
    {
      id: 'look', title: 'Look And Feel', icon: 'sparkle',
      intro: 'Shapes, spacing, sizes and fonts. Every combination is tested on the smallest phones.',
      keys: ['page_width', 'ui_corners', 'ui_shadows', 'ui_spacing', 'ui_text_size', 'ui_text_case', 'font_body', 'font_heading'],
      render: (f) => html`
        ${f.tiles('page_width', 'Page Width', [{ value: 'STANDARD', label: 'Standard', art: ART.width('s') }, { value: 'WIDE', label: 'Wide', art: ART.width('w') }, { value: 'FULL', label: 'Full Width', art: ART.width('f') }], { def: 'FULL' })}
        ${f.tiles('ui_corners', 'Corners', [{ value: 'SHARP', label: 'Sharp', art: ART.corner('sharp') }, { value: 'STANDARD', label: 'Standard', art: ART.corner('std') }, { value: 'ROUND', label: 'Round', art: ART.corner('round') }], { def: 'STANDARD' })}
        ${f.tiles('ui_shadows', 'Shadows', [{ value: 'NONE', label: 'None', art: ART.shadow('none') }, { value: 'SOFT', label: 'Soft', art: ART.shadow('soft') }, { value: 'STRONG', label: 'Strong', art: ART.shadow('strong') }], { def: 'SOFT' })}
        ${f.tiles('ui_spacing', 'Spacing', [{ value: 'COMPACT', label: 'Compact', art: ART.spacing('c') }, { value: 'COMFORTABLE', label: 'Comfortable', art: ART.spacing('m') }, { value: 'AIRY', label: 'Airy', art: ART.spacing('a') }], { def: 'COMFORTABLE' })}
        ${f.tiles('ui_text_size', 'Text Size', [{ value: 'NORMAL', label: 'Normal', art: ART.size('n') }, { value: 'LARGE', label: 'Large', art: ART.size('l') }, { value: 'XLARGE', label: 'Extra Large', art: ART.size('x') }], { def: 'NORMAL' })}
        ${f.tiles('ui_text_case', 'Text Style Of Buttons And Labels', [{ value: 'TITLE', label: 'Every Word Capital', art: ART.case('TITLE') }, { value: 'SENTENCE', label: 'First Letter Only', art: ART.case('SENTENCE') }], { def: 'TITLE', cols: 2 })}
        ${f.tiles('font_body', 'Font', fontTiles, { def: 'system' })}
        ${f.tiles('font_heading', 'Heading Font', fontTiles, { def: 'system' })}`
    },
    {
      id: 'products', title: 'Product Cards', icon: 'tag',
      intro: 'How products look in lists and on their own page.',
      keys: ['product_image_ratio', 'product_image_fit', 'reviews_enabled', 'sold_counts_mode', 'sold_counts_min', 'delivery_display', 'delivery_custom_text'],
      render: (f) => html`
        ${f.tiles('product_image_ratio', 'Photo Shape', [{ value: 'SQUARE', label: 'Square', art: ART.ratio('sq') }, { value: 'PORTRAIT', label: 'Tall (Clothing)', art: ART.ratio('po') }, { value: 'LANDSCAPE', label: 'Wide', art: ART.ratio('la') }], { def: 'SQUARE' })}
        ${f.note('Best product photos: square 1200 × 1200 pixels, tall 1080 × 1350, wide 1200 × 900. Take every photo in the shape you pick here and choose “Fill the box”, and there is never any blank space. Up to 6 photos per product (or per colour), JPG or WebP under 500 KB each.')}
        ${f.tiles('product_image_fit', 'Photo Fit', [{ value: 'contain', label: 'Show Whole Photo', art: ART.fit('contain') }, { value: 'cover', label: 'Fill The Box', art: ART.fit('cover') }], { def: 'contain', cols: 2, hint: '“Fill the box” gives no blank space when your photos are taken in the same shape.' })}
        ${f.group('Ratings And Counts', html`${f.switch('reviews_enabled', 'Show Star Ratings', { def: true, hint: 'Only real reviews from buyers that you approve.' })}
          ${f.tiles('sold_counts_mode', '“Bought” Counts', [{ value: 'OFF', label: 'Off' }, { value: 'MONTH', label: 'Past Month' }, { value: 'TOTAL', label: 'All Time' }, { value: 'BOTH', label: 'Both' }], { def: 'MONTH', cols: 4 })}
          ${f.range('sold_counts_min', 'Show Only From', { min: 10, max: 100, step: 10, unit: ' sold', def: 10, hint: 'Counts are real and rounded down (10+, 50+, 100+).' })}`)}
        ${f.group('Delivery On Product Pages', html`${f.tiles('delivery_display', 'Show', [{ value: 'DATE', label: 'Date', art: ART.delivery('8 Oct') }, { value: 'DAYS', label: 'Days', art: ART.delivery('3 Days') }, { value: 'TEXT', label: 'My Sentence', art: ART.delivery('Aa') }, { value: 'HIDDEN', label: 'Hide', art: ART.delivery('Off') }], { def: 'DATE', cols: 4 })}
          ${f.text('delivery_custom_text', 'My Delivery Sentence', { max: LIMITS.delivery_text_chars, placeholder: 'Ships Within 24 Hours From Coimbatore' })}`)}`
    },
    { id: 'tryout', title: 'Product Page Try Out', icon: 'box', intro: 'Try the Word style description editor, key features and specifications on any product. This is for trying only; product details are saved from the admin product form (Phase 2).', keys: [], custom: true },
    {
      id: 'footer', title: 'Footer', icon: 'menu',
      intro: 'The bottom of every page: your logo, contact details and link columns.',
      keys: ['footer_sections_json', 'footer_columns_json', 'footer_show_contact', 'footer_show_social', 'footer_show_hours', 'footer_about_text', 'footer_copyright_text', 'footer_text'],
      render: (f) => html`
        ${f.group('Columns', f.order('footer_sections_json', 'Tick To Show, Arrows To Reorder', { all: FOOTER_SECTIONS, names: FOOTER_NAMES, def: FOOTER_SECTIONS }))}
        ${f.group('Your Own Link Columns', f.list('footer_columns_json', {
          max: LIMITS.footer_columns, addLabel: 'Add A Column', empty: 'Add columns of your own links, for example “Shop” or “Follow us”.',
          title: (c) => c.title || 'New Column',
          body: (p, col) => html`${f.text(p + '.title', 'Column Title', { max: 40, placeholder: 'Shop' })}
            ${f.list(p + '.links', { label: 'Links', max: LIMITS.footer_links, addLabel: 'Add A Link', title: (l) => l.text || 'New Link', body: (lp) => html`<div class="st-grid-2">${f.text(lp + '.text', 'Words', { max: 60, placeholder: 'Sarees' })}${f.text(lp + '.href', 'Opens', { max: 300, placeholder: '/c/sarees/ or https://…' })}</div>` })}`
        }))}
        ${f.group('Show', html`${f.switch('footer_show_contact', 'Address, Phone And WhatsApp', { def: true })}${f.switch('footer_show_social', 'Social Media Icons', { def: true })}${f.switch('footer_show_hours', 'Opening Hours', { def: true })}`)}
        ${f.group('Words', html`${f.textarea('footer_about_text', 'About Text', { max: LIMITS.footer_text_chars, placeholder: '(Your tagline)' })}
          ${f.text('footer_copyright_text', 'Copyright Line', { max: 120, placeholder: '© {year} {shop}', hint: 'Leave empty to hide it.' })}
          ${f.text('footer_text', 'Small Note At The Bottom', { max: 300 })}`)}`
    },
    {
      id: 'popups', title: 'Offer Pop Ups', icon: 'gift',
      intro: 'A friendly offer that appears once, never on the cart or checkout. Turn on “Pop ups” above the preview to see it.',
      keys: ['popups_json'],
      render: (f) => f.list('popups_json', {
        label: 'Offers', max: LIMITS.popups, addLabel: 'Add An Offer', empty: 'No offers yet.',
        title: (pp) => (pp.title || pp.image_alt || 'New Offer') + (pp.active === false ? ' (Off)' : ''),
        body: (p) => html`${f.switch(p + '.active', 'Offer Is On', { def: true })}
          ${f.text(p + '.title', 'Title', { max: 80, placeholder: 'Diwali Sale, 20% Off', hint: 'Leave the title and text empty for a poster only offer.' })}
          ${f.textarea(p + '.text', 'Text', { max: 200, rows: 2 })}
          ${f.image(p + '.image', 'Poster (Optional)', { slot: 'poster', shape: '4 / 5', size: '1080 × 1350' })}
          ${f.text(p + '.image_alt', 'Describe The Poster', { max: 160 })}
          <div class="st-grid-2">${f.text(p + '.code', 'Coupon Code', { max: 30, placeholder: 'DIWALI20' })}${f.text(p + '.cta_text', 'Button Words', { max: 30, placeholder: 'Shop Sweets' })}</div>
          ${f.text(p + '.cta_link', 'Button Opens', { max: 300, placeholder: '/c/sweets-snacks/' })}
          <div class="st-grid-2">${f.datetime(p + '.starts_at', 'Starts')}${f.datetime(p + '.ends_at', 'Ends')}</div>
          ${f.tiles(p + '.frequency', 'Show It', [{ value: 'DAY', label: 'Once A Day' }, { value: 'SESSION', label: 'Once Per Visit' }, { value: 'ONCE', label: 'Only Once' }], { def: 'DAY' })}
          ${f.tiles(p + '.pages', 'On', [{ value: 'ALL', label: 'All Pages' }, { value: 'HOME', label: 'Home Page Only' }], { def: 'ALL', cols: 2 })}
          ${f.range(p + '.delay_seconds', 'Wait Before Showing', { min: 0, max: 30, step: 1, unit: ' s', def: 2 })}`
      })
    },
    { id: 'wording', title: 'Shop Wording', icon: 'type', intro: 'Change any sentence the shop shows, in every language. Words in {curly brackets} are filled in automatically and must stay.', keys: ['text_overrides_json'], custom: true },
    { id: 'languages', title: 'Languages', icon: 'globe', intro: 'Offer the shop in more than one language. Customers switch with the globe button.', keys: ['languages_json', 'default_language'], custom: true },
    { id: 'checks', title: 'Checks', icon: 'check-circle', intro: 'Problems found in your settings, and everything you changed.', keys: [], custom: true }
  ];
}
