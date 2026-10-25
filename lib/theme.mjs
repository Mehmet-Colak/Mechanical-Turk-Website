// Colour scheme from content/settings/theme.json → CSS custom properties.
// site.css holds the defaults; anything set in the CMS overrides them in an
// inline <style>. Only hex colours are accepted, so nothing else reaches the CSS.

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const color = (v) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : null);

const PALETTE = ["teal", "rust", "saffron", "sand", "burgundy"];
const MODE = [
  "bg", "surface", "surface_hover", "ink", "ink_soft", "line", "link", "accent", "on_accent",
  "kicker", "motif", "connector", "nav_current", "on_nav_current", "mark_bg", "mark_fg", "logo_color",
];

const decls = (group, keys) => keys
  .map((k) => [k, color(group?.[k])])
  .filter(([, v]) => v)
  .map(([k, v]) => `--${k.replace(/_/g, "-")}:${v};`)
  .join("");

export function themeCss(theme = {}) {
  const base = decls(theme.palette, PALETTE) + decls(theme.light, MODE);
  const dark = decls(theme.dark, MODE);
  let css = base ? `:root{${base}}` : "";
  if (dark) {
    css += `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}` +
      `:root[data-theme="dark"]{${dark}}`;
  }
  return css;
}

// Theme used when the visitor hasn't picked one: "light", "dark" or "" (follow the device).
export function defaultMode(theme = {}) {
  return theme.default_mode === "light" || theme.default_mode === "dark" ? theme.default_mode : "";
}

export function paletteColor(theme, key, fallback) {
  return color(theme?.palette?.[key]) || fallback;
}
