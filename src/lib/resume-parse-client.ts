/**
 * Metaprofile ATS — client-side резюме file→text extraction (Epic C, US-C02).
 *
 * Парсинг .docx / .pdf ЦІЛКОМ у браузері: сам файл нікуди не завантажується —
 * лише витягнутий plain text іде на Edge Function `parse-resume` для
 * структурованого AI-парсингу. Парсер-бібліотеки завантажуються через
 * dynamic import, щоб не роздувати головний бандл.
 *
 * Підхід скопійовано з studio-performance-hub/src/lib/c2c-ingest.ts і
 * адаптовано під потреби резюме (без xlsx-гілки, без PII-псевдонімізації —
 * той функціонал належить сусідньому продукту).
 */

export const MAX_RESUME_FILE_MB = 15;
export const MAX_RESUME_TEXT_CHARS = 150_000;

/** Кидається для всіх user-facing помилок екстракції; message вже україномовний. */
export class ResumeParseError extends Error {}

export type ResumeFileKind = "docx" | "pdf";

function detectKind(file: File): ResumeFileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf")) return "pdf";
  throw new ResumeParseError("Підтримуються лише файли .pdf та .docx");
}

function normalizeText(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function assertTextBudget(text: string): string {
  const trimmed = normalizeText(text);
  if (!trimmed) {
    throw new ResumeParseError(
      "У файлі не знайдено тексту. Якщо це скановане резюме — потрібен файл із текстовим шаром (OCR не підтримується).",
    );
  }
  if (trimmed.length > MAX_RESUME_TEXT_CHARS) {
    throw new ResumeParseError(
      `Забагато тексту: ${trimmed.length.toLocaleString("uk")} символів (ліміт ${MAX_RESUME_TEXT_CHARS.toLocaleString("uk")}).`,
    );
  }
  return trimmed;
}

async function parseDocx(buf: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value ?? "";
}

async function parsePdf(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    if (line.trim()) pages.push(line);
  }
  return pages.join("\n\n");
}

/** Витягує plain text з файлу резюме (.pdf або .docx) повністю на клієнті. */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_RESUME_FILE_MB * 1024 * 1024) {
    throw new ResumeParseError(`Файл завеликий (ліміт ${MAX_RESUME_FILE_MB} MB).`);
  }
  const kind = detectKind(file);
  const buf = await file.arrayBuffer();
  const raw = kind === "docx" ? await parseDocx(buf) : await parsePdf(buf);
  return assertTextBudget(raw);
}
