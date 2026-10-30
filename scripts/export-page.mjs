// Print every box on a page as Markdown, for copying out without clicking through the CMS
// Usage: npm run export -- <page> [en|tr|all]   e.g. npm run export -- project en | clip
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = path.join(ROOT, "content", "pages");

const [page, lang = "en"] = process.argv.slice(2);
const available = fs.readdirSync(PAGES).map((f) => path.basename(f, ".json"));
if (!page || !available.includes(page)) {
  console.error(`Usage: npm run export -- <page> [en|tr|all]\nPages: ${available.join(", ")}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path.join(PAGES, `${page}.json`), "utf8"));
const langs = lang === "all" ? Object.keys(data) : [lang];

const out = [];
const add = (...lines) => out.push(...lines.filter((l) => typeof l === "string"));
const hiddenTag = (x) => (x.hidden ? " (hidden)" : "");

for (const l of langs) {
  const p = data[l];
  if (!p) { console.error(`No "${l}" content in ${page}.json`); process.exit(1); }
  add(`# ${p.title || page} [${l}]`, "", p.kicker && `Kicker: ${p.kicker}`, p.description && `Description: ${p.description}`, p.intro, "");

  for (const b of p.blocks || []) {
    switch (b.type) {
      case "hero":
        add(`## Hero${hiddenTag(b)}`, b.kicker && `Kicker: ${b.kicker}`, b.heading && `**${b.heading}**`, b.lead);
        for (const btn of b.buttons || []) add(`- [${btn.label}](${btn.url})`);
        break;
      case "text":
        add(`## ${b.heading || "Text"}${hiddenTag(b)}`, b.body);
        break;
      case "cards":
        add(`## ${b.heading || "Cards"}${hiddenTag(b)}`, b.intro);
        for (const c of b.items || []) {
          add("", `### ${c.title}${hiddenTag(c)}`, [c.meta, c.badge].filter(Boolean).join(" · "), "", c.body);
          if (c.tags?.length) add(`Tags: ${c.tags.join(", ")}`);
          for (const link of c.links || []) add(`- [${link.label}](${link.url})`);
        }
        break;
      case "image":
        add(`## Image${hiddenTag(b)}`, b.caption || b.alt);
        break;
      case "contact":
      case "skills":
      case "timeline":
        add(`## ${b.heading || b.type}${hiddenTag(b)}`, b.intro);
        break;
      default:
        continue; // dividers etc. have no text
    }
    add("");
  }
}

console.log(out.join("\n").replace(/\n{3,}/g, "\n\n").trim());
