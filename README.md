# mechanical-turk.dev

Portfolio of **Mehmet Colakoglu**. A static, multi-page site with a Git-based CMS at `/admin`, hosted on Cloudflare Workers.

- **No dependencies.** `node build.mjs` turns the JSON in `content/` into HTML in `dist/`. Nothing to `npm install`, nothing to break.
- **CMS:** [Sveltia CMS](https://github.com/sveltia/sveltia-cms) at `/admin`. Every save is a Git commit; Cloudflare rebuilds in about a minute. Free, serverless, versioned.
- **Login:** a tiny GitHub OAuth handler in `worker/oauth/` runs in the site's Cloudflare Worker. No third-party auth service.
- **Languages:** English (`/`), Turkish (`/tr/`), Spanish (`/es/`), Arabic (`/ar/`, right-to-left), Russian (`/ru/`) and Chinese (`/zh/`). Each can be switched on or off in the CMS.

---

## Before you launch: personalize these

| What | Where in the CMS |
|---|---|
| Calendly link (hidden until set) | Settings → Contact links → Calendly: set URL, untick **Hide** |
| Political work (hidden placeholder card) | Pages → Work → “Political & civic work” card: edit, untick **Hide this card** |
| Read the life story and hobbies; they were written from your résumé | Pages → About me |
| Portrait photo (optional; replaces the kilim mark) | Settings → Site → Portrait photo |
| Project screenshots, demo videos, simulations | Pages → Work → each project card → Image gallery / Video link / Simulation URL |
| Social share image (1200×630) | Settings → Site → Default social share image |
| Résumé PDF | Media library: replace `mehmet-colakoglu-resume.pdf`. **It contains your phone number**; remove it from the PDF if you don’t want that public. |

---

## Setup, step by step

You need a GitHub account, a Cloudflare account, and the domain `mechanical-turk.dev`.

### 1. Put the code on GitHub

1. On GitHub, click **New repository**. Name it `mechanical-turk-dev`. Public or private both work. Don’t add a README or .gitignore (this repo has them).
2. Open `static/admin/config.yml` and change the `repo:` line to your username:
   ```yaml
   repo: Mehmet-Colak/mechanical-turk-dev
   ```
3. In a terminal, from this folder:
   ```bash
   git init -b main          # skip if the folder already has a .git directory
   git add -A
   git commit -m "Initial site"
   git remote add origin https://github.com/Mehmet-Colak/mechanical-turk-dev.git
   git push -u origin main
   ```

### 2. Deploy on Cloudflare Workers

The site runs as a Cloudflare Worker with static assets (configured in `wrangler.jsonc`).

1. In the Cloudflare dashboard go to **Workers & Pages → Create application → Import a repository**.
2. Authorize GitHub and pick `Mehmet-Colak/Mechanical-Turk-Website`.
3. Settings:
   | Setting | Value |
   |---|---|
   | Project name | `mechanical-turk-website` (must match `name` in `wrangler.jsonc`) |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
4. Click **Deploy**. You’ll get a `*.workers.dev` address in about a minute. (Node 22 is picked up from `.node-version`.)

From now on, every push to `main`, including every CMS save, rebuilds the site automatically.

### 3. Connect the domain

1. In the Worker open **Settings → Domains & Routes → Add → Custom domain** and enter `mechanical-turk.dev`.
2. If the domain is registered with or its DNS is on Cloudflare, it’s set up for you. Otherwise Cloudflare shows the record to add at your registrar (or tells you to move the nameservers to Cloudflare, which is the simplest option).
3. Optionally add `www.mechanical-turk.dev` too; Cloudflare will redirect it.

Wait until the domain shows **Active** before step 4, because the CMS login runs on that domain.

### 4. CMS authentication (GitHub login)

1. GitHub → your avatar → **Settings → Developer settings → OAuth Apps → New OAuth App**.
   | Field | Value |
   |---|---|
   | Application name | `mechanical-turk.dev CMS` |
   | Homepage URL | `https://mechanical-turk.dev` |
   | Authorization callback URL | `https://mechanical-turk.dev/oauth/callback` |
2. Click **Register application**, copy the **Client ID**, then **Generate a new client secret** and copy it (it’s shown once).
3. Cloudflare → your Worker → **Settings → Variables and Secrets** → add:
   | Name | Type | Value |
   |---|---|---|
   | `GITHUB_CLIENT_ID` | Text | the Client ID |
   | `GITHUB_CLIENT_SECRET` | Secret | the client secret |
4. Click **Deploy** when saving the variables so they take effect.
5. Visit **https://mechanical-turk.dev/admin/** and click **Sign in with GitHub**. Approve once; you’re in.

Only people with write access to the GitHub repo can save changes. Anyone else who signs in can’t commit.

**Alternative login without an OAuth app:** on the Sveltia sign-in screen choose **Sign in with token** and paste a GitHub *fine-grained personal access token* limited to this one repository with **Contents: Read and write**. Fine for one editor; the OAuth app is nicer on new devices.

**Editing offline:** in Chrome or Edge, run the site locally (below), open `http://localhost:8080/admin/`, and choose **Work with Local Repository**. Edits are written straight to your files; commit and push when done.

---

## Using the CMS

| Task | How |
|---|---|
| **Add a page** | Pages → **New Page**. Set a URL slug (e.g. `talks`), title, then add Sections. Add it to the menu under Settings → Navigation. |
| **Delete a page** | Open it → **Delete**. Also remove its menu item. Tick **Draft** instead to unpublish without deleting. |
| **Edit a page** | Pages → pick it. Each language appears as a tab/column; the strip at the top shows which one you’re editing (blue English, red Turkish, orange Spanish, green Arabic, purple Russian, gold Chinese). |
| **Turn a language on or off** | Settings → Languages → open the language → **Published on the site**. Turning it off removes its pages and its switcher entry at the next build; its translations stay saved. |
| **Add / remove cards** | Open the page → the *Cards* section → **Add Card** or the item menu → Remove. Drag to reorder. **Hide this card** keeps it saved but off the site. A section with no visible cards disappears. |
| **Add external links** | Card → *Buttons / links*; a *Link list* section; or a menu item with a full `https://…` link. External links open in a new tab with ↗. |
| **Add / remove nav headers** | Settings → Navigation menu. Add, delete, drag, or tick **Hide from menu**. |
| **Skills** | Data → Skills. Add groups and skills. Logo: `devicon:python` (from [devicon.dev](https://devicon.dev)), `si:ollama` (from [simpleicons.org](https://simpleicons.org)), any image URL, or upload one. If a logo can’t load, a clean text tile shows instead. |
| **Timeline** | Data → Timeline. Entries display top to bottom; drag to reorder. Pick a motif for each marker. |
| **Upload images** | Any image field, or the Media library. Files are committed to `static/assets/uploads/`. |
| **Decorative symbols** | Settings → Site, *Decorations*: bereket border symbols, chained motif dividers, woven card bands (global). Each card and long-form card also has **Show woven band next to title**. Choose the default divider motif there, or override per page and per divider. |
| **Motif reference** | Open **https://mechanical-turk.dev/admin/motifs/** (also linked under every motif drop-down) to see each kilim motif as a sidebar mark, timeline marker, divider and tab icon, in your current colours. |
| **Tab icon** | Settings → Tab icon. Pick a symbol and its own colours (empty = palette burgundy/saffron), or upload a square image to replace it. |
| **Custom pixel art** | Settings → Motif art. Upload a PNG (transparent background) for any symbol: bereket (9×21 grid), woven band tile (12×14) or any motif (square). **Paint in palette colours** keeps only the shape and colours it like the built-in art; turn it off to keep the image's own colours. Empty slot = built-in drawing. Check the result at /admin/motifs/. |
| **Card image left/right** | Card → *Image gallery* plus **Gallery position** (right or left). Text / long-form card and Data → Timeline entries → *Image* plus **Image position** (above, left or right). |
| **Colours** | Settings → Colour scheme. *Kilim palette* colours the motifs, symbols and favicon; *Light mode* and *Dark mode* set backgrounds, text, links, buttons and borders for each mode. Also choose whether new visitors start in light, dark or their device setting. |
| **Project / simulation display** | Card → *Image gallery* (2+ images get ‹ › arrows and a counter; click opens full size), *Video link* (YouTube, Vimeo, Google Drive or .mp4) and *Simulation URL* open in a viewer window. |

Section types you can stack on any page: **Hero, Text / long-form card, Cards, Timeline, Skills grid, Contact links, Link list, Image, Kilim divider.**

Text fields use Markdown: `**bold**`, `*italic*`, `[link](https://…)`, `- bullet`. In the hero headline, `*words*` are coloured instead of italic.

---

## Adding another language

1. In `static/admin/config.yml`, add the code to `i18n → locales`, e.g. `locales: [en, tr, es, ar, ru, zh, fr]`. This is the one code edit.
2. In the CMS: Settings → Languages → tick **Published on the site** for that language.
3. Translate pages in the new tab. Anything left untranslated falls back to English, field by field, so the site never shows blanks.

The new language appears at `/fr/` etc., in the language switcher, and in `hreflang` tags for search engines.

---

## Local development

Requires Node 20+.

```bash
npm run dev      # builds, watches content/static/lib, serves http://localhost:8080
npm run build    # one-off build to dist/
```

The CMS login only works on the real domain; locally use **Work with Local Repository** (above).

---

## Project structure

```
build.mjs              build script: content → dist/
lib/render.mjs         page templates and section (block) renderers
lib/markdown.mjs       small Markdown renderer (raw HTML is escaped)
lib/symbols.mjs        kilim symbols as SVG (sprite, patterns, helpers)
content/pages/*.json   one file per page (all languages in each file)
content/settings/      site, navigation, contact links, languages
content/skills.json    skills grid
content/timeline.json  timeline entries
static/                copied as-is: CSS, JS, uploads, /admin, _headers
worker/                Cloudflare Worker: serves dist/, handles /oauth (CMS GitHub login)
wrangler.jsonc         Cloudflare Workers config
```

## Design notes

- **Palette:** teal `#007A8E`, rust `#A45B3D`, saffron `#F9C74F`, sand `#D9BF77`, burgundy `#6A2C2E`. Light mode on cream, dark mode on deep burgundy-black; respects the system setting and remembers the toggle.
- **Type:** Zilla Slab (headings), IBM Plex Sans (body), IBM Plex Mono (labels).
- **Rules:** square corners, 3–4 px borders, no glow, no image zoom or darkening, hover is a subtle background change, buttons darken on hover, default letter-spacing.
- **Symbols**
  1. *Bereket* (border symbol): six woven copies sit on the header and footer borders, three turned 90° and three turned 270°, facing each other.
  2. *Woven band* (card headers): fills the space beside content-card titles. Off per card or globally.
  3. *Anadolu kilim motifs*: koç boynuzu, elibelinde, yıldız, göz, muska, pıtrak and doğum, chained into dividers and used as timeline markers.
- **Layout:** split layout with a sticky sidebar (identity + menu) and content column; collapses to a single column on phones. Every section is its own short page; no anchor scrolling.
- **Accessibility:** skip link, visible focus rings, `aria-current` in the menu, alt text fields everywhere, reduced-motion support for the timeline fade.
