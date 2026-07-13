import * as XLSX from "xlsx";

/**
 * Парсер лонг-листа з Excel (робочий формат MetaVision).
 *
 * Реальний файл виглядає так:
 *   # | Компанія | ПІБ | Посада | Досвід | Соцмережі | Status | Коментарі | Повідомлення
 * Але назви колонок від файлу до файлу гуляють, тому мапимо за синонімами,
 * а не за позицією. Те, що не впізнали, ігноруємо (краще менше, ніж навмання).
 */

export interface LongListRow {
  /** Номер рядка у файлі (для повідомлень про помилки). */
  rowNumber: number;
  fullName: string;
  company?: string;
  title?: string;
  experience?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  socials?: string;
  status?: string;
  comment?: string;
}

/** Як інтерпретувати колонку Status із файлу. */
export type RowOutcome = "active" | "rejected_by_candidate" | "rejected_by_agency";

const COLUMN_SYNONYMS: Record<keyof Omit<LongListRow, "rowNumber">, string[]> = {
  fullName: ["піб", "пiб", "імʼя", "ім'я", "имя", "кандидат", "name", "full name", "фио"],
  company: ["компанія", "компания", "company", "роботодавець"],
  title: ["посада", "должность", "title", "position", "роль"],
  experience: ["досвід", "опыт", "experience"],
  email: ["email", "e-mail", "пошта", "почта"],
  phone: ["телефон", "phone", "моб", "мобільний"],
  linkedin: ["linkedin", "лінкедін", "лінкедин"],
  socials: ["соцмережі", "соцмережi", "соцсети", "socials", "контакти", "звʼязок", "зв'язок"],
  status: ["status", "статус"],
  comment: ["коментарі", "коментар", "комментарии", "comment", "notes", "нотатки", "повідомлення"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Заголовок → поле LongListRow (перше входження виграє). */
function mapHeaders(headerRow: unknown[]): Record<number, keyof Omit<LongListRow, "rowNumber">> {
  const mapping: Record<number, keyof Omit<LongListRow, "rowNumber">> = {};
  const taken = new Set<string>();

  headerRow.forEach((cell, index) => {
    const header = normalizeHeader(cell);
    if (!header) return;
    for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
      if (taken.has(field)) continue;
      if (synonyms.some((s) => header === s || header.startsWith(s))) {
        mapping[index] = field as keyof Omit<LongListRow, "rowNumber">;
        taken.add(field);
        return;
      }
    }
  });

  return mapping;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const LINKEDIN_RE = /(https?:\/\/)?([\w.]*\.)?linkedin\.com\/[^\s,;]+/i;

/**
 * Класифікація рядка за колонкою Status.
 * У реальних файлах пишуть вільним текстом: «відмова кандидата, попросила...»,
 * «відмова агенції», «stop». Тому шукаємо ключові слова, а не точний збіг.
 */
export function classifyStatus(status: string | undefined): RowOutcome {
  const text = (status ?? "").toLowerCase();
  if (!text.trim()) return "active";
  const isRejection = /відмов|отказ|reject|declin|stop|не зацікав|не цікав/.test(text);
  if (!isRejection) return "active";
  if (/кандидат|сам|себе|candidate/.test(text)) return "rejected_by_candidate";
  if (/агенц|агент|agency|нам|ми /.test(text)) return "rejected_by_agency";
  return "rejected_by_agency";
}

export interface ParseResult {
  rows: LongListRow[];
  /** Колонки, які вдалось розпізнати (для показу в діалозі). */
  recognized: string[];
  /** Рядки, які пропущено (немає ПІБ). */
  skipped: number;
  sheetName: string;
}

/** Читає перший аркуш книги і повертає рядки лонг-листа. */
export function parseLongListWorkbook(data: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  if (matrix.length === 0) {
    return { rows: [], recognized: [], skipped: 0, sheetName: sheetName ?? "" };
  }

  // Шапка — перший рядок, у якому впізнано хоча б ПІБ (у файлах буває
  // порожній/титульний рядок згори).
  let headerIndex = 0;
  let mapping: Record<number, keyof Omit<LongListRow, "rowNumber">> = {};
  for (let i = 0; i < Math.min(matrix.length, 10); i += 1) {
    const candidate = mapHeaders(matrix[i] ?? []);
    if (Object.values(candidate).includes("fullName")) {
      headerIndex = i;
      mapping = candidate;
      break;
    }
  }
  if (Object.keys(mapping).length === 0) {
    return { rows: [], recognized: [], skipped: 0, sheetName: sheetName ?? "" };
  }

  const rows: LongListRow[] = [];
  let skipped = 0;

  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const raw = matrix[i] ?? [];
    const row: LongListRow = { rowNumber: i + 1, fullName: "" };

    Object.entries(mapping).forEach(([indexStr, field]) => {
      const value = raw[Number(indexStr)];
      const text = String(value ?? "").trim();
      if (!text) return;
      (row as unknown as Record<string, unknown>)[field] = text;
    });

    if (!row.fullName) {
      skipped += 1;
      continue;
    }

    // Email/LinkedIn часто ховаються в колонках «Соцмережі», «Досвід» чи «Коментарі».
    const haystack = [row.socials, row.experience, row.comment, row.linkedin]
      .filter(Boolean)
      .join(" ");
    if (!row.email) {
      const email = EMAIL_RE.exec(haystack)?.[0];
      if (email) row.email = email;
    }
    if (!row.linkedin) {
      const linkedin = LINKEDIN_RE.exec(haystack)?.[0];
      if (linkedin) row.linkedin = linkedin.startsWith("http") ? linkedin : `https://${linkedin}`;
    }

    rows.push(row);
  }

  const recognized = Array.from(new Set(Object.values(mapping)));
  return { rows, recognized, skipped, sheetName: sheetName ?? "" };
}
