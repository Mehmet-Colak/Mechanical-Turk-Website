// Live preview for the CMS editor: renders the page being edited with the site's own
// templates (lib/*.mjs, copied to /admin/preview/lib by build.mjs) as you type.
// Everything not in the open entry comes from the last published build (data.json).
import { renderPage } from "./preview/lib/render.mjs";
import { makeLocalize, motifArtFrom } from "./preview/lib/i18n.mjs";

const React = globalThis.__SVELTIA_CMS_REACT__;
const { createElement: h, useEffect, useRef, useState } = React;

const snapshot = await fetch("/admin/preview/data.json", { cache: "no-cache" }).then((r) => r.json());
const { languages, defaultCode, assetVersion, favicon } = snapshot;
const allCodes = languages.map((l) => String(l.code).toLowerCase());
const localize = makeLocalize(allCodes, defaultCode);
const enabled = languages.filter((l) => l.enabled || l.code === defaultCode);

// content file name -> key in snapshot.settings
const SETTINGS_KEYS = { site: "site", navigation: "nav", contact: "contact", theme: "theme", tab_icon: "tabIcon", motif_art: "motifArt" };
// Data/settings files have no page of their own; show the page that uses them most.
const PAGE_FOR_FILE = { timeline: "timeline", skills: "skills", contact: "contact" };

const permalinkOf = (raw, fallbackSlug) => {
  const fromDefault = raw[defaultCode] || raw;
  return String(fromDefault.permalink || raw.permalink || fallbackSlug || "home").toLowerCase().replace(/[^a-z0-9-]/g, "-");
};
const urlFor = (code) => {
  const prefix = code === defaultCode ? "" : `/${code}`;
  return (slug) => (slug === "home" || slug === "" ? `${prefix}/` : `${prefix}/${slug}/`);
};
const toJS = (v) => (v && typeof v.toJS === "function" ? v.toJS() : v || {});

function renderEntry(entry) {
  const others = toJS(entry.get("i18n"));
  const code = allCodes.find((c) => enabled.some((l) => l.code === c) && !(c in others)) || defaultCode;
  // Rebuild the single_file shape { en: {...}, tr: {...} } from the editor's live values.
  const liveRaw = { [code]: toJS(entry.get("data")) };
  for (const [c, v] of Object.entries(others)) liveRaw[c] = toJS(v.data);

  const file = String(entry.get("path") || "").split("/").pop().replace(/\.json$/, "");
  const isPage = entry.get("collection") === "pages";
  const settings = { ...snapshot.settings };
  let skills = snapshot.skills;
  let timeline = snapshot.timeline;
  if (!isPage && SETTINGS_KEYS[file]) settings[SETTINGS_KEYS[file]] = liveRaw;
  if (!isPage && file === "skills") skills = liveRaw;
  if (!isPage && file === "timeline") timeline = liveRaw;

  let raw, permalink;
  if (isPage) {
    raw = liveRaw;
    permalink = permalinkOf(raw, entry.get("slug") || file);
  } else {
    const wanted = PAGE_FOR_FILE[file] || "home";
    const pages = Object.entries(snapshot.pages).map(([name, r]) => ({ raw: r, permalink: permalinkOf(r, name) }));
    const match = pages.find((p) => p.permalink === wanted) || pages.find((p) => p.permalink === "home") || pages[0];
    raw = match.raw;
    permalink = match.permalink;
  }

  const lang = enabled.find((l) => l.code === code) || enabled[0];
  const contact = localize(settings.contact, code);
  return renderPage({
    page: { ...localize(raw, code), permalink },
    site: localize(settings.site, code),
    nav: localize(settings.nav, code),
    languages: enabled.map((l) => ({ ...l, default: l.code === defaultCode })),
    locale: lang,
    alternates: Object.fromEntries(enabled.map((l) => [l.code, urlFor(l.code)(permalink)])),
    data: { skills: localize(skills, code), timeline: localize(timeline, code), contact },
    urlFor: urlFor(code),
    assetVersion, theme: settings.theme, favicon, motifArt: motifArtFrom(settings.motifArt),
  });
}

// Links open in a new tab instead of navigating the preview away.
const withBase = (html) => html.replace(/<head>/i, `<head><base href="${location.origin}/" target="_blank">`);
const DESKTOP_WIDTH = 1280;

function SitePreview({ entry }) {
  const frame = useRef(null);
  const box = useRef(null);
  const [device, setDevice] = useState(() => { try { return localStorage.getItem("preview-device") || "desktop"; } catch { return "desktop"; } });
  const [boxWidth, setBoxWidth] = useState(0);

  let html;
  try { html = withBase(renderEntry(entry)); } catch (err) {
    html = `<pre style="padding:16px;white-space:pre-wrap">Preview unavailable: ${String(err && err.message).replace(/</g, "&lt;")}</pre>`;
  }

  // Rewrite the frame in place (debounced) so it keeps its scroll position while typing.
  useEffect(() => {
    const t = setTimeout(() => {
      const win = frame.current && frame.current.contentWindow;
      if (!win) return;
      const y = win.scrollY;
      win.document.open();
      win.document.write(html);
      win.document.close();
      const restore = () => win.scrollTo(0, y);
      restore();
      win.addEventListener("load", restore, { once: true });
    }, 200);
    return () => clearTimeout(t);
  }, [html]);

  useEffect(() => {
    if (!box.current || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(([e]) => setBoxWidth(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const pick = (d) => { setDevice(d); try { localStorage.setItem("preview-device", d); } catch { /* storage unavailable */ } };
  // Desktop: render at full desktop width and scale it down to fit the pane.
  const scale = device === "desktop" && boxWidth ? Math.min(1, boxWidth / DESKTOP_WIDTH) : 1;
  const height = "calc(100vh - 170px)";
  const tab = (d, label) => h("button", {
    type: "button", onClick: () => pick(d),
    "aria-pressed": device === d,
    style: { font: "inherit", fontSize: 13, padding: "4px 12px", cursor: "pointer", color: "inherit", border: "1px solid rgba(127,127,127,.5)", borderRadius: 4, fontWeight: device === d ? 700 : 400, background: device === d ? "rgba(127,127,127,.22)" : "transparent" },
  }, label);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
    h("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
      tab("desktop", "Desktop"), tab("phone", "Phone"),
      h("span", { style: { fontSize: 12, opacity: 0.7, marginInlineStart: "auto" } }, "Live preview · not yet published")),
    h("div", { ref: box, style: { width: "100%", height, overflow: "hidden", border: "1px solid rgba(127,127,127,.35)", display: "flex", justifyContent: "center" } },
      h("iframe", {
        ref: frame, title: "Page preview",
        style: device === "desktop"
          ? { width: DESKTOP_WIDTH, height: `calc((100vh - 170px) / ${scale})`, border: 0, flex: "none", transform: `scale(${scale})`, transformOrigin: "top left", marginInlineEnd: `${DESKTOP_WIDTH * (scale - 1)}px` }
          : { width: 390, height: "100%", border: 0, flex: "none" },
      })));
}

for (const name of ["pages", "data", "settings", "timeline", "skills", ...Object.keys(SETTINGS_KEYS)]) {
  window.CMS.registerPreviewTemplate(name, SitePreview);
}
