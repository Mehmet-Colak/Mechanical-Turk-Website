// HTML templates. Every function takes plain data from /content and returns a string.
import { escapeHtml as e, isExternal, markdown, markdownInline } from "./markdown.mjs";
import { sprite, borderSymbols, band, divider, motifIcon } from "./symbols.mjs";
import { themeCss, defaultMode, paletteColor } from "./theme.mjs";

const attr = (v) => e(v ?? "");

// ---------- links ----------
export function resolveLink(link, ctx) {
  const raw = String(link ?? "").trim();
  if (!raw) return { href: "#", external: false };
  if (/^(https?:|mailto:|tel:)/i.test(raw) || raw.startsWith("//")) {
    return { href: raw, external: /^(https?:)?\/\//i.test(raw) };
  }
  if (raw.startsWith("#")) return { href: raw, external: false };
  if (raw.startsWith("/assets/") || /\.[a-z0-9]{2,4}$/i.test(raw)) return { href: raw, external: false };
  const slug = raw.replace(/^\/+|\/+$/g, "");
  return { href: ctx.urlFor(slug === "" ? "home" : slug), external: false };
}

function a(link, label, { cls = "", current = false, newTab } = {}, ctx) {
  const { href, external } = resolveLink(link, ctx);
  const openNew = newTab ?? external;
  return `<a href="${attr(href)}"${cls ? ` class="${cls}"` : ""}${current ? ' aria-current="page"' : ""}${openNew ? ' target="_blank" rel="noopener"' : ""}>${label}${openNew ? ' <span class="ext" aria-hidden="true">↗</span>' : ""}</a>`;
}

function button(btn, ctx) {
  const style = btn.style === "secondary" ? "btn btn--secondary" : "btn";
  return a(btn.url, e(btn.label), { cls: style, newTab: btn.new_tab }, ctx);
}

// ---------- skill logos ----------
export function logoUrl(item, mode = "mono") {
  if (item.image) return item.image;
  const icon = String(item.icon || "").trim();
  if (!icon) return "";
  if (/^https?:\/\//.test(icon) || icon.startsWith("/")) return icon;
  const [source, rest] = icon.includes(":") ? icon.split(/:(.+)/) : ["devicon", icon];
  if (source === "si") {
    return mode === "brand"
      ? `https://cdn.simpleicons.org/${rest}`
      : `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${rest}.svg`;
  }
  if (source === "devicon") {
    if (rest.includes("/")) return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${rest}.svg`;
    const variant = mode === "brand" ? "original" : "plain";
    return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${rest}/${rest}-${variant}.svg`;
  }
  return "";
}

function monogram(name = "") {
  const clean = String(name).replace(/[^\p{L}\p{N}#+]/gu, "");
  return clean.length <= 4 ? clean : clean.slice(0, 2);
}

// ---------- media (project / simulation display) ----------
function gallery(images = [], ctx) {
  const list = images.filter((i) => i && i.image);
  if (!list.length) return "";
  const slides = list.map((img, i) =>
    `<figure class="gallery__slide"${i ? " hidden" : ""}>` +
    `<button type="button" class="gallery__open" data-lightbox="${attr(img.image)}" data-alt="${attr(img.alt)}" aria-label="${attr(ctx.ui.view_full)}">` +
    `<img src="${attr(img.image)}" alt="${attr(img.alt)}" loading="lazy" decoding="async"></button>` +
    (img.caption ? `<figcaption>${e(img.caption)}</figcaption>` : "") +
    `</figure>`).join("");
  const controls = list.length > 1
    ? `<div class="gallery__controls"><button type="button" class="gallery__btn" data-gallery-prev aria-label="${attr(ctx.ui.previous)}">‹</button>` +
      `<span class="gallery__count" aria-live="polite"><span data-gallery-index>1</span> / ${list.length}</span>` +
      `<button type="button" class="gallery__btn" data-gallery-next aria-label="${attr(ctx.ui.next)}">›</button></div>`
    : "";
  return `<div class="gallery" data-gallery>${slides}${controls}</div>`;
}

function mediaButtons(card, ctx) {
  const out = [];
  if (card.video_url) {
    out.push(`<button type="button" class="btn btn--secondary" data-media="${attr(card.video_url)}" data-media-kind="video" data-media-title="${attr(card.title)}">▶ ${e(ctx.ui.watch_video)}</button>`);
  }
  if (card.embed_url) {
    out.push(`<button type="button" class="btn btn--secondary" data-media="${attr(card.embed_url)}" data-media-kind="embed" data-media-title="${attr(card.title)}">${e(ctx.ui.open_demo)}</button>`);
  }
  return out.join("");
}

// ---------- cards ----------
function card(c, ctx, { headingLevel = 3 } = {}) {
  if (!c || c.hidden) return "";
  const h = `h${headingLevel}`;
  const showBand = c.show_band !== false && ctx.site.show_card_bands !== false;
  const media = gallery(c.gallery, ctx);
  const links = (c.links || []).filter((l) => l && l.url).map((l) => button({ ...l, style: l.style || "secondary" }, ctx)).join("");
  const tags = (c.tags || []).filter(Boolean);
  const metaBits = [
    c.meta ? `<span>${markdownInline(c.meta)}</span>` : "",
    c.badge ? `<span class="badge">${e(c.badge)}</span>` : "",
  ].join("");
  const mediaClass = media ? ` card--media${c.image_side === "left" ? " card--media-left" : ""}` : "";
  return `<article class="card${mediaClass}">` +
    `<div class="card__body">` +
      `<header class="card__head"><${h} class="card__title">${e(c.title)}</${h}>${showBand ? band() : ""}</header>` +
      (metaBits ? `<p class="card__meta">${metaBits}</p>` : "") +
      (c.body ? `<div class="prose">${markdown(c.body)}</div>` : "") +
      (tags.length ? `<ul class="tags">${tags.map((t) => `<li>${e(t)}</li>`).join("")}</ul>` : "") +
      (links || c.video_url || c.embed_url ? `<div class="card__links">${links}${mediaButtons(c, ctx)}</div>` : "") +
    `</div>` +
    (media ? `<div class="card__media">${media}</div>` : "") +
  `</article>`;
}

// Image placed above, left or right of a block of Markdown text.
function textWithImage(body, image, alt, position) {
  const img = image ? `<figure class="text__figure"><img src="${attr(image)}" alt="${attr(alt)}" loading="lazy"></figure>` : "";
  const text = body ? `<div class="prose">${markdown(body)}</div>` : "";
  const side = img && (position === "left" || position === "right") ? position : "";
  return side ? `<div class="text-media text-media--${side}">${img}${text}</div>` : img + text;
}

// ---------- blocks ----------
const blocks = {
  hero(b, ctx) {
    const tag = ctx.useH1() ? "h1" : "h2";
    const img = b.image ? `<figure class="hero__figure"><img src="${attr(b.image)}" alt="${attr(b.image_alt)}" decoding="async"></figure>` : "";
    return `<section class="block hero${img ? " hero--image" : ""}">` +
      `<div class="hero__text">` +
      (b.kicker ? `<p class="kicker">${e(b.kicker)}</p>` : "") +
      `<${tag} class="hero__title">${markdownInline(b.heading)}</${tag}>` +
      (b.lead ? `<div class="hero__lead prose">${markdown(b.lead)}</div>` : "") +
      ((b.buttons || []).length ? `<div class="btn-row">${b.buttons.map((x) => button(x, ctx)).join("")}</div>` : "") +
      `</div>${img}</section>`;
  },

  text(b, ctx) {
    const head = b.heading ? `<h2 class="${b.as_card ? "card__title" : "block__title"}">${e(b.heading)}</h2>` : "";
    const body = textWithImage(b.body, b.image, b.image_alt, b.image_position);
    if (b.as_card) {
      const showBand = b.show_band !== false && ctx.site.show_card_bands !== false;
      return `<section class="block"><article class="card"><div class="card__body">` +
        (head ? `<header class="card__head">${head}${showBand ? band() : ""}</header>` : "") +
        `${body}</div></article></section>`;
    }
    return `<section class="block">${head}${body}</section>`;
  },

  cards(b, ctx) {
    const items = (b.items || []).filter((c) => c && !c.hidden);
    // A section with no visible cards disappears until you add one in the CMS.
    if (!items.length) return "";
    const cols = String(b.columns || "1") === "2" ? " cards--two" : "";
    return `<section class="block">` +
      (b.heading ? `<h2 class="block__title">${e(b.heading)}</h2>` : "") +
      (b.intro ? `<div class="prose block__intro">${markdown(b.intro)}</div>` : "") +
      `<div class="cards${cols}">${items.map((c) => card(c, ctx, { headingLevel: b.heading ? 3 : 2 })).join("")}</div>` +
      `</section>`;
  },

  timeline(b, ctx) {
    const entries = (ctx.data.timeline.entries || []).filter((x) => x && !x.hidden);
    return `<section class="block">` +
      (b.heading ? `<h2 class="block__title">${e(b.heading)}</h2>` : "") +
      (b.intro ? `<div class="prose block__intro">${markdown(b.intro)}</div>` : "") +
      `<ol class="timeline">` +
      entries.map((t) =>
        `<li class="timeline__item reveal">` +
        `<span class="timeline__marker">${motifIcon(t.motif || "dogum")}</span>` +
        `<div class="timeline__card">` +
        `<p class="timeline__date">${e(t.date)}${t.kind_label ? ` <span class="badge">${e(t.kind_label)}</span>` : ""}</p>` +
        `<h3 class="timeline__title">${t.link ? a(t.link, e(t.title), {}, ctx) : e(t.title)}</h3>` +
        (t.org ? `<p class="timeline__org">${e(t.org)}</p>` : "") +
        textWithImage(t.body, t.image, t.image_alt, t.image_position || "right") +
        `</div></li>`).join("") +
      `</ol></section>`;
  },

  skills(b, ctx) {
    const mode = ctx.site.skill_logo_style === "brand" ? "brand" : "mono";
    const groups = (ctx.data.skills.groups || []).filter((g) => g && !g.hidden);
    return `<section class="block">` +
      (b.heading ? `<h2 class="block__title">${e(b.heading)}</h2>` : "") +
      (b.intro ? `<div class="prose block__intro">${markdown(b.intro)}</div>` : "") +
      groups.map((g) =>
        `<div class="skill-group"><h3 class="skill-group__title">${e(g.name)}</h3>` +
        `<ul class="skills skills--${mode}">` +
        (g.items || []).filter((s) => s && s.name).map((s) => {
          const url = logoUrl(s, mode);
          const logo = `<span class="skill__logo"${url ? ` data-src="${attr(url)}" style="--logo:url('${attr(url)}')"` : ""}>` +
            `<span class="skill__mono" aria-hidden="true">${e(s.short ? s.short : monogram(s.name))}</span></span>`;
          const inner = `${logo}<span class="skill__name">${e(s.name)}</span>`;
          return `<li class="skill">${s.url ? `<a class="skill__link" href="${attr(s.url)}" target="_blank" rel="noopener">${inner}</a>` : inner}</li>`;
        }).join("") +
        `</ul></div>`).join("") +
      `</section>`;
  },

  contact(b, ctx) {
    const items = (ctx.data.contact.items || []).filter((x) => x && !x.hidden && x.url);
    return `<section class="block">` +
      (b.heading ? `<h2 class="block__title">${e(b.heading)}</h2>` : "") +
      (b.intro ? `<div class="prose block__intro">${markdown(b.intro)}</div>` : "") +
      `<ul class="contact-list">` +
      items.map((c) => {
        const { href, external } = resolveLink(c.url, ctx);
        return `<li><a class="contact-row" href="${attr(href)}"${external ? ' target="_blank" rel="noopener"' : ""}>` +
          `<span class="contact-row__label">${e(c.label)}</span>` +
          `<span class="contact-row__value">${e(c.value || c.url)}</span>` +
          `<span class="contact-row__arrow" aria-hidden="true">${external ? "↗" : "→"}</span></a></li>`;
      }).join("") +
      `</ul></section>`;
  },

  links(b, ctx) {
    const items = (b.items || []).filter((x) => x && x.url);
    return `<section class="block">` +
      (b.heading ? `<h2 class="block__title">${e(b.heading)}</h2>` : "") +
      `<ul class="link-list">` +
      items.map((l) => `<li>${a(l.url, e(l.label), { cls: "link-list__link" }, ctx)}${l.note ? `<span class="link-list__note">${e(l.note)}</span>` : ""}</li>`).join("") +
      `</ul></section>`;
  },

  image(b) {
    if (!b.image) return "";
    return `<figure class="block figure"><img src="${attr(b.image)}" alt="${attr(b.alt)}" loading="lazy">` +
      (b.caption ? `<figcaption>${e(b.caption)}</figcaption>` : "") + `</figure>`;
  },

  divider(b, ctx) {
    if (ctx.site.show_motif_dividers === false) return "";
    return divider(b.motif || ctx.site.divider_motif);
  },
};

function renderBlocks(list = [], ctx) {
  return list.filter((b) => b && !b.hidden).map((b) => {
    const fn = blocks[b.type];
    return fn ? fn(b, ctx) : "";
  }).join("\n");
}

// ---------- page shell ----------
export function renderPage({ page, site, nav, languages, locale, alternates, data, urlFor, assetVersion, theme = {}, favicon = { href: "/favicon.svg", type: "image/svg+xml" }, motifArt = {} }) {
  let h1Used = false;
  const ctx = {
    site, data, locale, urlFor,
    ui: site.ui || {},
    useH1: () => (h1Used ? false : (h1Used = true)),
  };

  const isHome = page.permalink === "home";
  const showHeader = page.show_title !== false;
  if (showHeader) h1Used = true;

  const pageHeader = showHeader
    ? `<header class="page-header">` +
      (page.kicker ? `<p class="kicker">${e(page.kicker)}</p>` : "") +
      `<h1 class="page-title">${e(page.title)}</h1>` +
      (page.intro ? `<div class="prose page-intro">${markdown(page.intro)}</div>` : "") +
      `</header>` + (site.show_motif_dividers !== false ? divider(page.divider_motif || site.divider_motif) : "")
    : "";

  const body = renderBlocks(page.blocks, ctx);

  const navItems = (nav.items || []).filter((n) => n && !n.hidden && n.label).map((n) => {
    const { href } = resolveLink(n.link, ctx);
    const current = href === urlFor(page.permalink);
    return `<li>${a(n.link, e(n.label), { cls: "nav__link", current, newTab: n.new_tab }, ctx)}</li>`;
  }).join("");

  const enabledLangs = languages.filter((l) => l.enabled);
  const langSwitcher = enabledLangs.length > 1
    ? `<details class="lang" data-lang>` +
      `<summary class="lang__toggle" aria-label="${attr(ctx.ui.language)}"><span>${e(locale.code.toUpperCase())}</span><span aria-hidden="true">▾</span></summary>` +
      `<ul class="lang__menu">` +
      enabledLangs.map((l) => `<li><a href="${attr(alternates[l.code])}" hreflang="${attr(l.code)}" lang="${attr(l.code)}"${l.code === locale.code ? ' aria-current="true"' : ""}><span class="lang__code">${e(l.code.toUpperCase())}</span> ${e(l.name)}</a></li>`).join("") +
      `</ul></details>`
    : "";

  const themeToggle = `<button type="button" class="theme-toggle" data-theme-toggle aria-label="${attr(ctx.ui.toggle_theme)}" title="${attr(ctx.ui.toggle_theme)}">` +
    `<svg class="theme-toggle__sun" viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="7" width="6" height="6"/><rect x="9" y="1" width="2" height="3"/><rect x="9" y="16" width="2" height="3"/><rect x="1" y="9" width="3" height="2"/><rect x="16" y="9" width="3" height="2"/><rect x="3.3" y="3.3" width="2" height="2"/><rect x="14.7" y="3.3" width="2" height="2"/><rect x="3.3" y="14.7" width="2" height="2"/><rect x="14.7" y="14.7" width="2" height="2"/></svg>` +
    `<svg class="theme-toggle__moon" viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 2.5a7.5 7.5 0 1 0 5 13.1A8 8 0 0 1 12.5 2.5Z"/></svg>` +
    `</button>`;

  const portrait = site.portrait
    ? `<img class="id__portrait" src="${attr(site.portrait)}" alt="${attr(site.portrait_alt || site.owner_name)}" width="160" height="160">`
    : `<span class="id__mark" aria-hidden="true">${motifIcon(site.mark_motif || "koc_boynuzu", "id__mark-icon")}</span>`;

  const title = isHome ? `${site.owner_name} · ${site.role_line}` : `${page.title} · ${site.owner_name}`;
  const description = page.description || site.description || "";
  const canonical = `${site.domain}${urlFor(page.permalink)}`;
  const ogImage = page.og_image || site.og_image;

  const hreflangs = enabledLangs.map((l) => `<link rel="alternate" hreflang="${attr(l.code)}" href="${attr(site.domain + alternates[l.code])}">`).join("") +
    `<link rel="alternate" hreflang="x-default" href="${attr(site.domain + alternates[languages.find((l) => l.default)?.code || "en"])}">`;

  const customColours = themeCss(theme);
  const startMode = defaultMode(theme);

  const fontLinks = (locale.font_url ? [locale.font_url] : []).map((f) => `<link rel="stylesheet" href="${attr(f)}">`).join("");

  return `<!doctype html>
<html lang="${attr(locale.code)}" dir="${locale.dir === "rtl" ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${attr(canonical)}">
${hreflangs}
<meta property="og:type" content="website">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${attr(canonical)}">
${ogImage ? `<meta property="og:image" content="${attr(ogImage.startsWith("http") ? ogImage : site.domain + ogImage)}">` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<meta name="theme-color" content="${attr(paletteColor(theme, "burgundy", "#6A2C2E"))}">
<link rel="icon" href="${attr(favicon.href)}"${favicon.type ? ` type="${attr(favicon.type)}"` : ""}>
<script>(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=${JSON.stringify(startMode)};if(t)document.documentElement.dataset.theme=t;}catch(e){}document.documentElement.classList.add("js");})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Zilla+Slab:wght@500;600;700&display=swap">
${fontLinks}
<link rel="stylesheet" href="/assets/css/site.css?v=${assetVersion}">
${customColours ? `<style>${customColours}</style>` : ""}
</head>
<body class="page-${attr(page.permalink)}">
${sprite(motifArt)}
<a class="skip-link" href="#main">${e(ctx.ui.skip_to_content)}</a>
<header class="site-header">
  <div class="site-header__inner">
    <a class="brand" href="${attr(urlFor("home"))}">${e(site.site_name)}</a>
    <div class="controls">${langSwitcher}${themeToggle}</div>
  </div>
  ${site.show_border_symbols !== false ? borderSymbols("header") : ""}
</header>
<div class="shell">
  <aside class="sidebar"><div class="sidebar__inner">
    <div class="id">
      ${portrait}
      <p class="id__name">${e(site.owner_name)}</p>
      <p class="id__role">${e(site.role_line)}</p>
      ${site.tagline ? `<p class="id__tagline">${e(site.tagline)}</p>` : ""}
      ${site.status ? `<p class="id__status"><span class="id__status-dot" aria-hidden="true"></span><span>${markdownInline(site.status)}</span></p>` : ""}
    </div>
    <nav class="nav" aria-label="${attr(ctx.ui.main_navigation)}"><ul>${navItems}</ul></nav>
  </div></aside>
  <main id="main" class="content">
    ${pageHeader}
    ${body}
  </main>
</div>
<footer class="site-footer">
  ${site.show_border_symbols !== false ? borderSymbols("footer") : ""}
  <p>${e(site.footer_text || "© mechanical-turk.dev")}</p>
</footer>
<dialog class="viewer" data-viewer aria-label="${attr(ctx.ui.media_viewer)}">
  <div class="viewer__bar"><p class="viewer__title" data-viewer-title></p><button type="button" class="viewer__close" data-viewer-close aria-label="${attr(ctx.ui.close)}">✕</button></div>
  <div class="viewer__stage" data-viewer-stage></div>
</dialog>
<script src="/assets/js/site.js?v=${assetVersion}" defer></script>
</body>
</html>
`;
}
