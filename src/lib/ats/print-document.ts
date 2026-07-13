/**
 * Брендований друк документів агенції (бріф для кандидатів, стратегія пошуку).
 *
 * PDF робиться не бібліотекою, а друком браузера з окремого standalone-вікна:
 * той самий підхід, що й «Версія для клієнта» у звітах — нуль залежностей,
 * користувач сам обирає «Зберегти як PDF».
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Мінімальний markdown → HTML: заголовки, списки, жирний, абзаци. */
function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    const bullet = /^\s*[-•*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length + 1; // # → h2
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return html.join("\n");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export interface PrintableSection {
  heading: string;
  body: string;
}

export interface PrintableDocument {
  title: string;
  subtitle?: string;
  intro?: string;
  sections: PrintableSection[];
  /** Підпис у футері: «Документ сформовано …». */
  footerNote?: string;
}

export function buildPrintableHtml(doc: PrintableDocument): string {
  const today = new Date().toLocaleDateString("uk-UA", { year: "numeric", month: "long", day: "numeric" });
  const sectionsHtml = doc.sections
    .map(
      (section) => `
  <section>
    <h2>${escapeHtml(section.heading)}</h2>
    ${markdownToHtml(section.body)}
  </section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #111827;
    line-height: 1.6;
    max-width: 820px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  header img { height: 40px; width: auto; display: block; }
  header .agency-fallback { font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }
  h1 { font-size: 23px; margin: 0 0 4px; }
  .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
  .intro { font-size: 15px; color: #374151; margin-bottom: 8px; }
  h2 { font-size: 17px; margin-top: 26px; }
  h3 { font-size: 15px; margin-top: 18px; }
  p { margin: 8px 0; }
  ul { padding-left: 22px; margin: 8px 0; }
  li { margin: 4px 0; }
  section { break-inside: avoid; }
  footer {
    margin-top: 44px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    color: #6b7280;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .print-btn {
    background: #111827;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
  }
  @media print {
    .print-btn { display: none; }
    body { padding: 0 12px; }
  }
</style>
</head>
<body>
  <header>
    <img src="/logo.png" alt="Metavision" onerror="this.style.display='none'; document.getElementById('agency-fallback').style.display='inline';" />
    <span id="agency-fallback" class="agency-fallback" style="display:none;">Metavision</span>
  </header>
  <h1>${escapeHtml(doc.title)}</h1>
  ${doc.subtitle ? `<div class="subtitle">${escapeHtml(doc.subtitle)}</div>` : ""}
  ${doc.intro ? `<div class="intro">${markdownToHtml(doc.intro)}</div>` : ""}
  ${sectionsHtml}
  <footer>
    <span>${escapeHtml(doc.footerNote ?? `Документ сформовано: ${today}`)}</span>
    <button class="print-btn" onclick="window.print()">Друк / зберегти PDF</button>
  </footer>
</body>
</html>`;
}

/** Відкриває документ у новій вкладці з кнопкою «Друк / зберегти PDF». */
export function openPrintableDocument(doc: PrintableDocument): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(buildPrintableHtml(doc));
  win.document.close();
  return true;
}
