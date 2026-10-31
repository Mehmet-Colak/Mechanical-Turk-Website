#!/usr/bin/env node
// Static site build. Zero dependencies: `node build.mjs` writes the site to ./dist
//
//   content/   JSON written by the CMS (pages, settings, skills, timeline)
//   static/    copied as-is (CSS, JS, uploads, /admin, Cloudflare _headers)
//   lib/       templates, markdown renderer, SVG symbols
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { renderPage } from "./lib/render.mjs";
import { faviconSvg, MOTIF_KEYS } from "./lib/symbols.mjs";
import { renderMotifReference } from "./lib/motif-reference.mjs";
import { pngSize, resizePng } from "./lib/png-resize.mjs";
import { color, paletteColor } from "./lib/theme.mjs";
import { makeLocalize, motifArtFrom, motifSizesFrom } from "./lib/i18n.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(ROOT, "content");
const STATIC = path.join(ROOT, "static");
const OUT = path.join(ROOT, "dist");

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`Could not read ${path.relative(ROOT, file)}: ${err.message}`);
  }
};

// ---------- languages ----------
const languages = readJson(path.join(CONTENT, "settings/languages.json")).languages
  .map((l) => ({ ...l, code: String(l.code).toLowerCase() }));
const ALL_CODES = languages.map((l) => l.code);
const DEFAULT = (languages.find((l) => l.default) || languages[0]).code;
const ENABLED = languages.filter((l) => l.enabled || l.code === DEFAULT);

const localize = makeLocalize(ALL_CODES, DEFAULT);

// ---------- load content ----------
const settings = {
  site: readJson(path.join(CONTENT, "settings/site.json")),
  nav: readJson(path.join(CONTENT, "settings/navigation.json")),
  contact: readJson(path.join(CONTENT, "settings/contact.json")),
  theme: readJson(path.join(CONTENT, "settings/theme.json")),
  tabIcon: readJson(path.join(CONTENT, "settings/tab_icon.json")),
  motifArt: readJson(path.join(CONTENT, "settings/motif_art.json")),
};
const skills = readJson(path.join(CONTENT, "skills.json"));
const timeline = readJson(path.join(CONTENT, "timeline.json"));

const pageDir = path.join(CONTENT, "pages");
const pageFiles = fs.readdirSync(pageDir).filter((f) => f.endsWith(".json"));
const pages = pageFiles.map((f) => {
  const raw = readJson(path.join(pageDir, f));
  const fromDefault = raw[DEFAULT] || raw;
  const permalink = String(fromDefault.permalink || raw.permalink || f.replace(/\.json$/, "")).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return { file: f, raw, permalink };
});

const seen = new Set();
for (const p of pages) {
  if (seen.has(p.permalink)) throw new Error(`Two pages use the URL slug "${p.permalink}". Change one in the CMS.`);
  seen.add(p.permalink);
}
if (!seen.has("home")) console.warn('⚠ No page with URL slug "home" — the site will have no front page.');

// ---------- URLs ----------
function urlFor(code) {
  const prefix = code === DEFAULT ? "" : `/${code}`;
  return (slug) => (slug === "home" || slug === "" ? `${prefix}/` : `${prefix}/${slug}/`);
}

// ---------- output ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(STATIC, OUT, { recursive: true });
// The favicon needs uploaded motif art inlined as a data: URI (see faviconSvg).
// Uploads are drawn at about 36px at most, so a full-size file only costs download time.
// Pages get a small copy under a hashed name, which browsers can cache for good. Art that
// is already tiny is left alone and marked as pixel art, to stay sharp when enlarged.
const MOTIF_MAX = 256;
const PIXEL_ART_MAX = 128;
function optimiseArt(key, a) {
  if (!a.href.startsWith("/") || !/\.png$/i.test(a.href)) return a;
  let file;
  try { file = path.join(OUT, decodeURI(a.href)); } catch { return a; }
  if (!file.startsWith(OUT) || !fs.existsSync(file)) return a;
  const source = fs.readFileSync(file);
  const size = pngSize(source);
  if (!size) return a;
  if (Math.max(size.width, size.height) <= PIXEL_ART_MAX) return { ...a, pixelated: true };
  if (Math.max(size.width, size.height) <= MOTIF_MAX) return a;
  const small = resizePng(source, MOTIF_MAX);
  if (!small || small.length >= source.length) return a;
  const name = `${key}-${crypto.createHash("sha1").update(small).digest("hex").slice(0, 8)}.png`;
  fs.mkdirSync(path.join(OUT, "assets/motifs"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "assets/motifs", name), small);
  return { ...a, href: `/assets/motifs/${name}` };
}
const motifArt = Object.fromEntries(Object.entries(motifArtFrom(settings.motifArt)).map(([k, a]) => [k, optimiseArt(k, a)]));
const motifSizes = motifSizesFrom(settings.motifArt);
const MIME = { ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const inlineArt = (a) => {
  if (!a || !a.href.startsWith("/")) return null;
  let file;
  try { file = path.join(OUT, decodeURI(a.href)); } catch { return null; }
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime || !file.startsWith(OUT) || !fs.existsSync(file)) return null;
  return { ...a, href: `data:${mime};base64,${fs.readFileSync(file).toString("base64")}` };
};
const faviconArt = Object.fromEntries(Object.entries(motifArt).map(([k, a]) => [k, inlineArt(a)]).filter(([, a]) => a));

const tabIcon = settings.tabIcon;
const iconColours = {
  bg: color(tabIcon.background) || paletteColor(settings.theme, "burgundy", "#6A2C2E"),
  fg: color(tabIcon.foreground) || paletteColor(settings.theme, "saffron", "#F9C74F"),
};
fs.writeFileSync(path.join(OUT, "favicon.svg"), faviconSvg({ ...iconColours, symbol: tabIcon.symbol, art: faviconArt[MOTIF_KEYS.includes(tabIcon.symbol) ? tabIcon.symbol : "bereket"] || null }));

const hash = (file) => crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
// An uploaded image replaces the generated icon; the version query makes browsers pick up changes.
const favicon = typeof tabIcon.image === "string" && tabIcon.image.trim()
  ? { href: tabIcon.image.trim() }
  : { href: `/favicon.svg?v=${hash(path.join(OUT, "favicon.svg"))}`, type: "image/svg+xml" };
const assetVersion = hash(path.join(STATIC, "assets/css/site.css")) + hash(path.join(STATIC, "assets/js/site.js"));

// Motif reference sheet for editors, linked from the CMS motif pickers.
fs.mkdirSync(path.join(OUT, "admin/motifs"), { recursive: true });
fs.writeFileSync(path.join(OUT, "admin/motifs/index.html"), renderMotifReference({ theme: settings.theme, iconColours, assetVersion, motifArt, motifSizes, faviconArt }));

// CMS live preview (static/admin/preview.js): the templates plus a snapshot of the
// published content, so the editor can render the page being edited.
fs.cpSync(path.join(ROOT, "lib"), path.join(OUT, "admin/preview/lib"), { recursive: true });
fs.writeFileSync(path.join(OUT, "admin/preview/data.json"), JSON.stringify({
  languages, defaultCode: DEFAULT, settings, skills, timeline,
  pages: Object.fromEntries(pages.map((p) => [p.file.replace(/\.json$/, ""), p.raw])),
  assetVersion, favicon,
}));

const sitemap = [];
let count = 0;

for (const lang of ENABLED) {
  const site = localize(settings.site, lang.code);
  const nav = localize(settings.nav, lang.code);
  const contact = localize(settings.contact, lang.code);
  const data = { skills: localize(skills, lang.code), timeline: localize(timeline, lang.code), contact };

  for (const p of pages) {
    const page = { ...localize(p.raw, lang.code), permalink: p.permalink };
    if (page.draft) continue;

    const alternates = Object.fromEntries(ENABLED.map((l) => [l.code, urlFor(l.code)(p.permalink)]));
    const url = urlFor(lang.code)(p.permalink);
    const html = renderPage({
      page, site, nav, languages: ENABLED.map((l) => ({ ...l, default: l.code === DEFAULT })),
      locale: lang, alternates, data, urlFor: urlFor(lang.code), assetVersion, theme: settings.theme, favicon, motifArt, motifSizes,
    });

    const outFile = path.join(OUT, url, "index.html");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
    sitemap.push(`${site.domain}${url}`);
    count++;
  }
}

// 404 page in the default language
const site404 = localize(settings.site, DEFAULT);
const notFound = {
  permalink: "404", title: site404.ui?.not_found_title || "Page not found", show_title: true,
  intro: site404.ui?.not_found_body || "This page doesn't exist. [Go home](/)", blocks: [],
};
fs.writeFileSync(path.join(OUT, "404.html"), renderPage({
  page: notFound, site: site404, nav: localize(settings.nav, DEFAULT),
  languages: [{ ...languages.find((l) => l.code === DEFAULT), default: true, enabled: true }],
  locale: languages.find((l) => l.code === DEFAULT),
  alternates: { [DEFAULT]: "/" },
  data: { skills: {}, timeline: {}, contact: {} }, urlFor: urlFor(DEFAULT), assetVersion, theme: settings.theme, favicon, motifArt, motifSizes,
}));

fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${site404.domain}/sitemap.xml\n`);

console.log(`✓ Built ${count} pages in ${ENABLED.length} language(s): ${ENABLED.map((l) => l.code).join(", ")} → dist/`);
