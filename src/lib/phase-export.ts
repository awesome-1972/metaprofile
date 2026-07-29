/**
 * Metaprofile ATS — експорт кандидатів етапу в Excel (.xlsx).
 *
 * Формат за зразком робочого лонг-листа агенції: аркуш «Кандидати» з колонками
 * № | Компанія | ПІБ | Посада | Категорія | Досвід | Соцмережі | Статус, де
 * «Статус» — випадаючий список (data validation), і аркуш «Дашборд» з підрахунком
 * за статусом (COUNTIF). ExcelJS імпортується динамічно (важка бібліотека — не в
 * головному бандлі), мірор resume-parse-client.ts.
 */

/** Значення випадаючого списку «Статус» (зі зразкової таблиці агенції). */
export const EXPORT_STATUSES: string[] = [
  "Розглядається",
  "Запит у LI",
  "Inmail надіслано",
  "Inmail та email надіслано",
  "Контактуємо",
  "Контакт, запит на рекомендації",
  "Спілкуємося",
  "Запит",
  "Пауза",
  "Дав рекомендацію",
  "Відмова кандидата",
  "Відмова кандидата, обіцяв рекомендації",
  "Відмова агенції",
  "Шорт лист",
  "Шорт лист, відмова Клієнта",
  "Рекомендовано Клієнту",
];

export interface PhaseExportRow {
  company: string;
  fullName: string;
  position: string;
  category: string;
  experience: string;
  socials: string;
  status: string;
}

/**
 * Будує та завантажує .xlsx для одного етапу пошуку.
 * @param phaseName — назва етапу (йде в назву файлу й заголовок).
 * @param vacancyTitle — назва вакансії (для назви файлу).
 * @param rows — рядки кандидатів (уже змаплені).
 */
export async function buildAndDownloadPhaseXlsx(
  phaseName: string,
  vacancyTitle: string,
  rows: PhaseExportRow[],
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Metaprofile ATS";
  wb.created = new Date();

  // ── Аркуш «Дашборд» (спершу — щоб на нього посилалась валідація) ──────────
  const dash = wb.addWorksheet("Дашборд");
  dash.getColumn(1).width = 4;
  dash.getColumn(2).width = 36;
  dash.getColumn(3).width = 12;
  dash.getColumn(4).width = 10;

  dash.getCell("B1").value = `Дашборд — ${phaseName}`;
  dash.getCell("B1").font = { bold: true, size: 14 };
  dash.getCell("B3").value = "Статус";
  dash.getCell("C3").value = "Кількість";
  dash.getCell("D3").value = "%";
  ["B3", "C3", "D3"].forEach((c) => {
    dash.getCell(c).font = { bold: true };
    dash.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  });

  const firstStatusRow = 4;
  const lastStatusRow = firstStatusRow + EXPORT_STATUSES.length - 1; // 4..19
  const totalRow = lastStatusRow + 1; // 20
  EXPORT_STATUSES.forEach((st, i) => {
    const r = firstStatusRow + i;
    dash.getCell(`B${r}`).value = st;
    // Кількість цього статусу серед кандидатів (колонка H на аркуші «Кандидати»).
    dash.getCell(`C${r}`).value = { formula: `COUNTIF('Кандидати'!$H$2:$H$100000,$B${r})` };
    dash.getCell(`D${r}`).value = { formula: `IF($C$${totalRow}=0,0,C${r}/$C$${totalRow})` };
    dash.getCell(`D${r}`).numFmt = "0.0%";
  });
  dash.getCell(`B${totalRow}`).value = "Разом";
  dash.getCell(`B${totalRow}`).font = { bold: true };
  dash.getCell(`C${totalRow}`).value = { formula: `SUM(C${firstStatusRow}:C${lastStatusRow})` };
  dash.getCell(`C${totalRow}`).font = { bold: true };
  dash.getCell(`D${totalRow}`).value = { formula: `IF($C$${totalRow}=0,0,1)` };
  dash.getCell(`D${totalRow}`).numFmt = "0.0%";

  // ── Аркуш «Кандидати» ─────────────────────────────────────────────────────
  const ws = wb.addWorksheet("Кандидати", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const headers = ["№", "Компанія", "ПІБ", "Посада", "Категорія", "Досвід", "Соцмережі", "Статус"];
  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
  });

  const widths = [5, 22, 24, 34, 20, 50, 26, 22];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  rows.forEach((row, i) => {
    ws.addRow([
      i + 1,
      row.company,
      row.fullName,
      row.position,
      row.category,
      row.experience,
      row.socials,
      row.status,
    ]);
  });

  // Перенос тексту для «Досвід».
  ws.getColumn(6).alignment = { wrapText: true, vertical: "top" };

  // Data validation «Статус» — випадаючий список із аркуша «Дашборд»
  // (посилання на діапазон, бо значення містять коми — inline-список зламався б).
  const lastDataRow = Math.max(rows.length + 1, 2);
  for (let r = 2; r <= lastDataRow; r++) {
    ws.getCell(`H${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`=Дашборд!$B$${firstStatusRow}:$B$${lastStatusRow}`],
      showErrorMessage: false,
    };
  }

  // ── Завантаження ──────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  const fileName = `${safe(vacancyTitle)} — ${safe(phaseName)}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
