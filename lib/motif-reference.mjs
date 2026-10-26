// /admin/motifs/ — a reference sheet for editors showing every kilim motif the
// way the site draws it (sidebar mark, timeline marker, divider, tab icon),
// in the current colour scheme. Linked from the motif pickers in the CMS.
import { escapeHtml as e } from "./markdown.mjs";
import { sprite, borderSymbols, band, divider, motifIcon, faviconSvg, MOTIFS, MOTIF_KEYS } from "./symbols.mjs";
import { themeCss } from "./theme.mjs";

const iconImg = (svg, size) =>
  `<img src="data:image/svg+xml,${encodeURIComponent(svg)}" width="${size}" height="${size}" alt="">`;

function tabIcons(symbol, colours, art) {
  const svg = faviconSvg({ ...colours, symbol, art: art[symbol] || null });
  return `<div class="ref__sample"><div class="ref__tabs">${iconImg(svg, 48)}${iconImg(svg, 16)}</div><span class="ref__label">Tab icon</span></div>`;
}

export function renderMotifReference({ theme = {}, iconColours, assetVersion, motifArt = {}, faviconArt = {} }) {
  const motifCards = MOTIF_KEYS.map((key) => {
    const [name, meaning = ""] = MOTIFS[key].label.split(" (");
    return `<section class="ref__card">
  <h2 class="ref__name">${e(name)} <span class="ref__meaning">${e(meaning.replace(/\)$/, ""))}</span></h2>
  <p class="ref__key">Option value: <code>${e(key)}</code></p>
  <div class="ref__samples">
    <div class="ref__sample"><span class="id__mark">${motifIcon(key, "id__mark-icon")}</span><span class="ref__label">Sidebar mark</span></div>
    <div class="ref__sample"><span class="ref__marker">${motifIcon(key)}</span><span class="ref__label">Timeline marker</span></div>
    ${tabIcons(key, iconColours, faviconArt)}
  </div>
  ${divider(key)}
  <span class="ref__label">Divider</span>
</section>`;
  }).join("\n");

  const customColours = themeCss(theme);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Kilim motif reference</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Zilla+Slab:wght@600;700&display=swap">
<link rel="stylesheet" href="/assets/css/site.css?v=${e(assetVersion)}">
${customColours ? `<style>${customColours}</style>` : ""}
<style>
  body { background: var(--bg); color: var(--ink); font-family: var(--font-body, "IBM Plex Sans", sans-serif); margin: 0; }
  .ref { max-width: 980px; margin: 0 auto; padding: 32px 16px 64px; }
  .ref h1 { font-family: var(--font-display); font-size: 2rem; margin: 0 0 8px; }
  .ref__intro { color: var(--ink-soft); margin: 0 0 20px; max-width: 70ch; }
  .ref__modes { display: flex; gap: 8px; margin-bottom: 28px; }
  .ref__modes button { font-family: var(--font-mono); font-size: 0.85rem; padding: 6px 12px; border: 2px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; }
  .ref__modes button[aria-pressed="true"] { background: var(--nav-current); color: var(--on-nav-current); border-color: var(--nav-current); }
  .ref__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 440px), 1fr)); gap: 20px; }
  .ref__card { border: var(--border) solid var(--line); background: var(--surface); padding: 20px 22px; }
  .ref__name { font-family: var(--font-display); font-size: 1.35rem; margin: 0; }
  .ref__meaning { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 400; color: var(--kicker); }
  .ref__key { margin: 4px 0 16px; font-size: 0.85rem; color: var(--ink-soft); }
  .ref__samples { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end; }
  .ref__sample { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .ref__label { font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink-soft); }
  .ref__marker { width: 32px; height: 32px; display: grid; place-items: center; background: var(--bg); color: var(--motif); }
  .ref__marker svg { width: 24px; height: 24px; }
  .ref__tabs { display: flex; gap: 12px; align-items: flex-end; }
  .ref .motif-divider { margin: 20px 0 6px; }
  .ref__wide { border: var(--border) solid var(--line); background: var(--surface); padding: 20px 22px; margin-bottom: 20px; }
  .ref__border { position: relative; border-bottom: var(--border) solid var(--line); height: 28px; margin: 4px 0 28px; }
  .ref__band { display: flex; margin: 8px 0 6px; }
</style>
</head>
<body>
${sprite(motifArt)}
<main class="ref">
  <h1>Kilim motif reference</h1>
  <p class="ref__intro">Every motif you can pick in the CMS, drawn exactly as the site draws it, in your current colour scheme. Use the “Option value” to match a motif to the drop-down lists. Changes show up here after you save them in Settings → Colour scheme, Tab icon or Motif art.</p>
  <div class="ref__modes" role="group" aria-label="Preview mode">
    <button type="button" data-mode="light">Light mode</button>
    <button type="button" data-mode="dark">Dark mode</button>
  </div>

  <section class="ref__wide">
    <h2 class="ref__name">Bereket <span class="ref__meaning">abundance</span></h2>
    <p class="ref__key">Header and footer border symbol. Option value for the tab icon: <code>bereket</code></p>
    <div class="ref__border">${borderSymbols("header")}</div>
    <div class="ref__samples">${tabIcons("bereket", iconColours, faviconArt)}</div>
  </section>

  <section class="ref__wide">
    <h2 class="ref__name">Woven band</h2>
    <p class="ref__key">Fills the space beside card titles (Settings → Site → Decorations).</p>
    <div class="ref__band">${band()}</div>
  </section>

  <div class="ref__grid">
${motifCards}
  </div>
</main>
<script>
(function () {
  var root = document.documentElement;
  var buttons = document.querySelectorAll("[data-mode]");
  function set(mode) {
    root.dataset.theme = mode;
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === mode)); });
  }
  buttons.forEach(function (b) { b.addEventListener("click", function () { set(b.dataset.mode); }); });
  set(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
})();
</script>
</body>
</html>
`;
}
