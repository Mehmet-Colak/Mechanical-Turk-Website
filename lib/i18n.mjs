// Translation fallback, shared by build.mjs and the CMS live preview.
//
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

export function makeLocalize(allCodes, defaultCode) {
  return function localize(file, code) {
    const shared = {};
    for (const [k, v] of Object.entries(file)) if (!allCodes.includes(k)) shared[k] = v;
    const base = { ...shared, ...(file[defaultCode] || {}) };
    return code === defaultCode ? base : fallback(file[code] || {}, base);
  };
}

// Uploaded motif art: { key: { href, recolour } }. Pages reference the file by URL.
export function motifArtFrom(settings = {}) {
  return Object.fromEntries(Object.entries(settings)
    .filter(([, a]) => typeof a?.image === "string" && a.image.trim())
    .map(([k, a]) => [k, { href: a.image.trim(), recolour: k !== "band" && a.recolour !== false }]));
}
