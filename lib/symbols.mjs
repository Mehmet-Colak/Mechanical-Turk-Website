// Decorative kilim symbols, recreated as SVG and recoloured to the site palette.
//
//  1. BEREKET (border symbol.png)   -> 6 copies on the header/footer borders
//  2. WOVEN BAND (next to the card headers.png) -> fills the empty space next
//     to content-card titles
//  3. ANADOLU KILIM MOTIFS (symbols.png) -> chained into dividers
//
// Pixel-woven symbols are authored as ASCII grids so they keep the stepped,
// hand-woven look of a real kilim. Every symbol is emitted once into a hidden
// sprite and referenced with <use> or pattern fills.

// ---------- pixel helpers ----------
// Each character is one woven "knot". Letters map to palette classes.
const PIXEL_CLASS = { X: "k-ink", T: "k-teal", R: "k-rust", B: "k-burg", Y: "k-saff", S: "k-sand" };

function pixelsToRects(rows, offsetX = 0, offsetY = 0) {
  const out = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || ch === " ") { x++; continue; }
      let run = 1;
      while (row[x + run] === ch) run++;
      const cls = PIXEL_CLASS[ch] || "k-ink";
      out.push(`<rect class="${cls}" x="${x + offsetX}" y="${y + offsetY}" width="${run}" height="1"/>`);
      x += run;
    }
  });
  return out.join("");
}

// ---------- 1. Bereket (abundance) — border symbol, pointing up ----------
export const BEREKET = [
  "....X....",
  "...XXX...",
  "..XX.XX..",
  ".XX...XX.",
  "..XX.XX..",
  "...XXX...",
  "X...X...X",
  "XX..X..XX",
  ".XX.X.XX.",
  "..XXXXX..",
  "X..XXX..X",
  "XX..X..XX",
  ".XX.X.XX.",
  "..XXXXX..",
  "X..XXX..X",
  "XX..X..XX",
  ".XX.X.XX.",
  "..XXXXX..",
  "...XXX...",
  "..XX.XX..",
  ".XX...XX.",
];

// ---------- 2. Woven band tile (card headers) ----------
// 12 x 14 tile: burgundy selvedge, teal interlocking X lattice,
// rust centres and burgundy diamonds across the seams.
const BAND_TILE = [
  "BBBBBBBBBBBB",
  "T..........T",
  ".T...RR...T.",
  "..T..RR..T..",
  "...T....T...",
  "B...TRRT...B",
  "BB..RRRR..BB",
  "BB..RRRR..BB",
  "B...TRRT...B",
  "...T....T...",
  "..T..RR..T..",
  ".T...RR...T.",
  "T..........T",
  "BBBBBBBBBBBB",
];

// ---------- 3. Anadolu kilim motifs (dividers) ----------
// Vector versions of motifs from the chart, drawn on a 20 x 20 grid.
const stroke = (d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="miter" stroke-linecap="square"/>`;
const fill = (d, rule = "nonzero") => `<path d="${d}" fill="currentColor" fill-rule="${rule}"/>`;

export const MOTIFS = {
  // Koç boynuzu — ram's horn: heroism, strength
  koc_boynuzu: {
    label: "Koç boynuzu (ram's horn: strength)",
    svg: stroke("M2.5 8 L10 15.5 L17.5 8") + stroke("M2.5 8 L5.5 4.5 L8.5 7.5") + stroke("M17.5 8 L14.5 4.5 L11.5 7.5") + fill("M10 7.2 L12.4 9.6 L10 12 L7.6 9.6 Z"),
  },
  // Elibelinde — hands on hips: motherhood, fertility
  elibelinde: {
    label: "Elibelinde (hands on hips: abundance)",
    svg: fill("M10 1 L12.6 3.6 L10 6.2 L7.4 3.6 Z") + stroke("M3.5 7.5 L10 13 L16.5 7.5") + stroke("M3.5 18.5 L10 13 L16.5 18.5") + stroke("M3.5 7.5 L1.8 10") + stroke("M16.5 7.5 L18.2 10"),
  },
  // Yıldız — star: happiness
  yildiz: {
    label: "Yıldız (star: happiness)",
    svg: fill("M5 5 H15 V15 H5 Z M10 1 L19 10 L10 19 L1 10 Z M10 7 L13 10 L10 13 L7 10 Z", "evenodd"),
  },
  // Göz — eye: protection from the evil eye
  goz: {
    label: "Göz (eye: protection)",
    svg: stroke("M10 2.5 L16 8.5 L10 14.5 L4 8.5 Z") + fill("M10 6.3 L12.2 8.5 L10 10.7 L7.8 8.5 Z") + stroke("M10 14.5 V18") + stroke("M5 18 H15"),
  },
  // Muska — amulet: protection
  muska: {
    label: "Muska (amulet: protection)",
    svg: fill("M10 2 L19 18 H1 Z M10 11 L13 16.4 H7 Z", "evenodd"),
  },
  // Pıtrak — burdock: abundance, protection
  pitrak: {
    label: "Pıtrak (burdock: abundance)",
    svg: stroke("M10 4 L16 10 L10 16 L4 10 Z") + fill("M8.6 0.6 H11.4 V3.4 H8.6 Z M16.6 8.6 H19.4 V11.4 H16.6 Z M8.6 16.6 H11.4 V19.4 H8.6 Z M0.6 8.6 H3.4 V11.4 H0.6 Z") + fill("M10 8 L12 10 L10 12 L8 10 Z"),
  },
  // Doğum / çoğalma — simple diamond: birth, growth
  dogum: {
    label: "Doğum (diamond: growth)",
    svg: fill("M10 3 L17 10 L10 17 L3 10 Z"),
  },
};

export const MOTIF_KEYS = Object.keys(MOTIFS);

// Divider tile: motif in the centre, chained to its neighbours by a line
// and small diamonds that sit across the tile seam.
function dividerPattern(key) {
  const W = 40, H = 22;
  const m = MOTIFS[key] || MOTIFS.koc_boynuzu;
  const link = `<g class="k-link">` +
    `<rect x="0" y="10.2" width="8" height="1.6"/>` +
    `<rect x="32" y="10.2" width="8" height="1.6"/>` +
    `<path d="M0 7.5 L3.5 11 L0 14.5 Z"/>` +
    `<path d="M40 7.5 L36.5 11 L40 14.5 Z"/>` +
    `</g>`;
  return `<pattern id="divider-${key}" width="${W}" height="${H}" patternUnits="userSpaceOnUse">` +
    link + `<g class="k-motif" transform="translate(10 1)">${m.svg}</g></pattern>`;
}

export function sprite() {
  const symbols = [
    `<symbol id="sym-bereket" viewBox="0 0 9 21" shape-rendering="crispEdges">${pixelsToRects(BEREKET)}</symbol>`,
    ...MOTIF_KEYS.map((k) => `<symbol id="motif-${k}" viewBox="0 0 20 20">${MOTIFS[k].svg}</symbol>`),
  ];
  const patterns = [
    `<pattern id="kilim-band" width="12" height="14" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)"><rect class="k-sand" width="12" height="14"/>${pixelsToRects(BAND_TILE)}</pattern>`,
    ...MOTIF_KEYS.map(dividerPattern),
  ];
  return `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0" xmlns="http://www.w3.org/2000/svg"><defs>${patterns.join("")}</defs>${symbols.join("")}</svg>`;
}

// ----- markup helpers used by templates -----

// Six bereket copies: three turned 270° (facing ←) and three turned 90° (facing →).
export function borderSymbols(position = "header") {
  const one = (deg) => `<span class="bereket bereket--${deg}"><svg viewBox="0 0 9 21" aria-hidden="true"><use href="#sym-bereket"/></svg></span>`;
  return `<div class="border-symbols border-symbols--${position}" aria-hidden="true">` +
    one(270) + one(270) + one(270) + `<span class="border-symbols__gap"></span>` + one(90) + one(90) + one(90) +
    `</div>`;
}

export function band() {
  return `<svg class="kilim-band" aria-hidden="true" focusable="false" preserveAspectRatio="none"><rect width="100%" height="100%" fill="url(#kilim-band)"/></svg>`;
}

export function divider(motif = "koc_boynuzu") {
  const key = MOTIFS[motif] ? motif : "koc_boynuzu";
  return `<div class="motif-divider" role="presentation"><svg aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#divider-${key})"/></svg></div>`;
}

export function motifIcon(motif = "yildiz", cls = "motif-icon") {
  const key = MOTIFS[motif] ? motif : "yildiz";
  return `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><use href="#motif-${key}"/></svg>`;
}

// Favicon: a woven bereket (or any motif) on a solid square.
export function faviconSvg({ bg = "#6A2C2E", fg = "#F9C74F", symbol = "bereket" } = {}) {
  const art = MOTIFS[symbol]
    ? `<g transform="translate(5 5) scale(1.1)" color="${fg}">${MOTIFS[symbol].svg}</g>`
    : `<g transform="translate(9.5 3) scale(1.4 1.24)" fill="${fg}" shape-rendering="crispEdges">${pixelsToRects(BEREKET).replace(/ class="k-ink"/g, "")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/>${art}</svg>`;
}
