// Small, dependency-free Markdown renderer.
// Supports: headings, paragraphs, bold, italic, inline code, links, images,
// unordered/ordered lists, blockquotes, horizontal rules and hard line breaks.
// Raw HTML is escaped on purpose so CMS content can never break the layout.

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isExternal(url = "") {
  return /^(https?:)?\/\//i.test(url);
}

function safeUrl(url = "") {
  const trimmed = String(url).trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "#";
  return trimmed;
}

export function inline(text = "") {
  const codeSpans = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code>${code}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  // images ![alt](src)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
    `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy">`);
  // links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const url = safeUrl(href.replace(/&amp;/g, "&"));
    const ext = isExternal(url) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${escapeHtml(url)}"${ext}>${label}</a>`;
  });
  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(/ {2,}\n/g, "<br>\n");

  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => codeSpans[Number(i)]);
}

export function markdown(source = "") {
  if (!source) return "";
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let i = 0;

  const isBlank = (l) => /^\s*$/.test(l);
  const isUl = (l) => /^\s*[-*+]\s+/.test(l);
  const isOl = (l) => /^\s*\d+[.)]\s+/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      // Markdown h1 maps to h2: the page title is always the only h1.
      const level = Math.min(heading[1].length + 1, 5);
      html.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++; continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { html.push("<hr>"); i++; continue; }

    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${markdown(buf.join("\n"))}</blockquote>`);
      continue;
    }

    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line);
      const items = [];
      while (i < lines.length && (ordered ? isOl(lines[i]) : isUl(lines[i]))) {
        let item = lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, "");
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !isUl(lines[i]) && !isOl(lines[i])) {
          item += " " + lines[i].trim();
          i++;
        }
        items.push(`<li>${inline(item)}</li>`);
      }
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const para = [];
    while (
      i < lines.length && !isBlank(lines[i]) && !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) && !isUl(lines[i]) && !isOl(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    html.push(`<p>${inline(para.join("\n"))}</p>`);
  }
  return html.join("\n");
}

export function markdownInline(source = "") {
  return inline(String(source || "").replace(/\n+/g, " "));
}
