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
import { faviconSvg } from "./lib/symbols.mjs";

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

// ---------- i18n merge ----------
// Files use the CMS "single_file" structure: { "en": {...}, "tr": {...} }.
// Anything missing in a translation falls back to the default language,
// field by field and card by card, so untranslated images and URLs still work.
const isEmpty = (v) => v === undefined || v === null || v === "";
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function fallback(loc, base) {
  if (isEmpty(loc)) return base;
  if (Array.isArray(loc) && Array.isArray(base)) {
    return loc.map((item, i) => {
      const b = base[i];
      if (isObj(item) && isObj(b) && (item.type === undefined || item.type === b.type)) return fallback(item, b);
      return item;
    });
  }
  if (isObj(loc) && isObj(base)) {
    const out = { ...loc };
    for (const [k, v] of Object.entries(base)) out[k] = k in loc ? fallback(loc[k], v) : v;
    return out;
  }
  return loc;
}

function localize(file, code) {
  const shared = {};
  for (const [k, v] of Object.entries(file)) if (!ALL_CODES.includes(k)) shared[k] = v;
  const base = { ...shared, ...(file[DEFAULT] || {}) };
  return code === DEFAULT ? base : fallback(file[code] || {}, base);
}

// ---------- load content ----------
const settings = {
  site: readJson(path.join(CONTENT, "settings/site.json")),
  nav: readJson(path.join(CONTENT, "settings/navigation.json")),
  contact: readJson(path.join(CONTENT, "settings/contact.json")),
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
fs.writeFileSync(path.join(OUT, "favicon.svg"), faviconSvg());

const hash = (file) => crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
const assetVersion = hash(path.join(STATIC, "assets/css/site.css")) + hash(path.join(STATIC, "assets/js/site.js"));

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
      locale: lang, alternates, data, urlFor: urlFor(lang.code), assetVersion,
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
  data: { skills: {}, timeline: {}, contact: {} }, urlFor: urlFor(DEFAULT), assetVersion,
}));

fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${site404.domain}/sitemap.xml\n`);

console.log(`✓ Built ${count} pages in ${ENABLED.length} language(s): ${ENABLED.map((l) => l.code).join(", ")} → dist/`);
