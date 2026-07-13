// src/components/ats/ReportsTab.tsx
//
// Вкладка "Звіти" — список candidate_reports вакансії, кнопки "Звіт по
// кандидату" / "Порівняльний звіт" (виклик Edge generate-candidate-report),
// перегляд звіту (markdown без нових залежностей — <pre> whitespace-pre-wrap),
// копіювання і завантаження .md, редактор промту вакансії (vacancy_prompts).
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Copy, Download, Sparkles, Users as UsersIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  useCandidateReports,
  useGenerateCandidateReport,
  type CandidateReportKind,
} from "@/hooks/ats/use-candidate-reports";
import { useVacancyPrompts, useSaveVacancyPrompt } from "@/hooks/ats/use-vacancy-prompts";
import type { ApplicationWithCandidate } from "@/hooks/ats/use-applications";
import { useInterviewsByApplication, useFetchMeetTranscript } from "@/hooks/ats/use-interviews";

interface ReportsTabProps {
  vacancyId: string;
  applications: ApplicationWithCandidate[];
}

const kindLabel: Record<CandidateReportKind, string> = {
  candidate_report: "Звіт по кандидату",
  comparative_report: "Порівняльний звіт",
};

const statusLabel: Record<string, string> = {
  generating: "Генерується...",
  ready: "Готово",
  failed: "Помилка",
};

const statusColor: Record<string, string> = {
  generating: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
};

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Мінімальний, без-залежностей markdown→HTML конвертер для клієнтської версії
 * звіту: підтримує лише `## heading` → h2, порожній рядок = абзац, `- `/`* `
 * рядки → ul/li. Навмисно НЕ повний markdown-парсер — досить для AI-звітів
 * generate-candidate-report, які самі генеруються за простим шаблоном.
 */
function simpleMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      htmlParts.push(`<ul>${listBuffer.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
      listBuffer = [];
    }
  };
  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      htmlParts.push(`<p>${escapeHtml(paragraphBuffer.join(" "))}</p>`);
      paragraphBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length + 1, 4); // ## -> h2, ### -> h3
      htmlParts.push(`<h${level}>${escapeHtml(headingMatch[2])}</h${level}>`);
      continue;
    }
    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      listBuffer.push(listMatch[1]);
      continue;
    }
    flushList();
    paragraphBuffer.push(line);
  }
  flushParagraph();
  flushList();
  return htmlParts.join("\n");
}

function buildClientReportHtml(title: string, markdown: string): string {
  const bodyHtml = simpleMarkdownToHtml(markdown);
  const today = new Date().toLocaleDateString("uk-UA", { year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)} — Metavision</title>
<style>
  :root { color-scheme: light; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1f2933;
    max-width: 820px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    line-height: 1.6;
  }
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 20px;
    margin-bottom: 32px;
  }
  header img { height: 40px; width: auto; display: block; }
  header .agency-fallback {
    font-size: 22px;
    font-weight: 700;
    color: #111827;
    letter-spacing: 0.02em;
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin-top: 28px; color: #111827; }
  h3 { font-size: 15px; margin-top: 20px; color: #111827; }
  p { margin: 10px 0; }
  ul { padding-left: 22px; }
  li { margin: 4px 0; }
  footer {
    margin-top: 48px;
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
  .print-btn:hover { background: #1f2937; }
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
  <h1>${escapeHtml(title)}</h1>
  <div class="report-body">
    ${bodyHtml}
  </div>
  <footer>
    <span>Звіт сформовано: ${escapeHtml(today)}</span>
    <button class="print-btn" onclick="window.print()">Друк / зберегти PDF</button>
  </footer>
</body>
</html>`;
}

export function ReportsTab({ vacancyId, applications }: ReportsTabProps) {
  const { data: reports, isLoading } = useCandidateReports(vacancyId);
  const { data: prompts } = useVacancyPrompts(vacancyId);
  const generateReport = useGenerateCandidateReport();
  const savePrompt = useSaveVacancyPrompt();

  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genKind, setGenKind] = useState<CandidateReportKind>("candidate_report");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [transcript, setTranscript] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [transcriptDocUrl, setTranscriptDocUrl] = useState("");

  // Інтервʼю обраної заявки — щоб знайти найсвіжіше interview_id для
  // fetch-meet-transcript (Edge вимагає конкретний interview_id, у яке
  // зберігається/оновлюється транскрипт).
  const { data: applicationInterviews } = useInterviewsByApplication(
    genKind === "candidate_report" ? selectedApplicationId || undefined : undefined,
  );
  const latestInterview = applicationInterviews?.[0] ?? null;
  const fetchTranscript = useFetchMeetTranscript();

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewContent, setViewContent] = useState<{ title: string; content: string } | null>(null);

  const [promptKind, setPromptKind] = useState<CandidateReportKind>("candidate_report");
  const [promptDraft, setPromptDraft] = useState<Record<CandidateReportKind, string>>({
    candidate_report: "",
    comparative_report: "",
  });

  const promptByKind = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of prompts ?? []) map[p.kind] = p.prompt;
    return map;
  }, [prompts]);

  const currentPromptValue = promptDraft[promptKind] || promptByKind[promptKind] || "";

  const openGenerateDialog = (kind: CandidateReportKind) => {
    setGenKind(kind);
    setSelectedApplicationId("");
    setTranscript("");
    setExtraNotes("");
    setTranscriptDocUrl("");
    setGenDialogOpen(true);
  };

  // Після успішного fetch-meet-transcript useFetchMeetTranscript інвалідує
  // interviews-запит цієї заявки; коли прийде повний transcript (не лише
  // 500-символьний preview з відповіді Edge) — підставляємо його в textarea.
  useEffect(() => {
    if (latestInterview?.transcript) {
      setTranscript(latestInterview.transcript);
    }
  }, [latestInterview?.transcript, latestInterview?.transcript_fetched_at]);

  const handleFetchTranscript = () => {
    if (!latestInterview || !transcriptDocUrl.trim()) return;
    fetchTranscript.mutate({
      interview_id: latestInterview.id,
      doc_url_or_id: transcriptDocUrl.trim(),
      application_id: selectedApplicationId,
    });
  };

  const handleGenerate = () => {
    if (genKind === "candidate_report" && !selectedApplicationId) {
      toast.error("Оберіть заявку кандидата");
      return;
    }
    generateReport.mutate(
      {
        vacancyId,
        kind: genKind,
        applicationId: genKind === "candidate_report" ? selectedApplicationId : undefined,
        transcript: transcript.trim() || undefined,
        extraNotes: extraNotes.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setGenDialogOpen(false);
          setViewContent({ title: kindLabel[genKind], content: data.content_md });
          setViewDialogOpen(true);
        },
      },
    );
  };

  const handleViewReport = (reportId: string) => {
    const report = (reports ?? []).find((r) => r.id === reportId);
    if (!report) return;
    if (report.status !== "ready" || !report.content_md) {
      toast.error(report.status === "failed" ? report.error || "Звіт завершився помилкою" : "Звіт ще генерується");
      return;
    }
    const candidateName = report.application?.candidate?.full_name;
    setViewContent({
      title: `${kindLabel[report.kind]}${candidateName ? ` — ${candidateName}` : ""}`,
      content: report.content_md,
    });
    setViewDialogOpen(true);
  };

  const handleCopy = () => {
    if (!viewContent) return;
    navigator.clipboard
      .writeText(viewContent.content)
      .then(() => toast.success("Скопійовано"))
      .catch(() => toast.error("Не вдалося скопіювати"));
  };

  const handleDownload = () => {
    if (!viewContent) return;
    downloadMarkdown(`${viewContent.title.replace(/[^\p{L}\p{N}_-]+/gu, "_")}.md`, viewContent.content);
  };

  /**
   * "Версія для клієнта" — окреме вікно (не React-дерево): document.write
   * повного standalone HTML з інлайновими стилями/onerror-фолбеком на лого,
   * кнопкою друку (inline onclick, бо це окремий document). Без нової Edge
   * Function — переформатовує вже наявний markdown звіту (viewContent).
   */
  const handleOpenClientVersion = () => {
    if (!viewContent) return;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Не вдалося відкрити нове вікно (заблоковано браузером)");
      return;
    }
    const html = buildClientReportHtml(viewContent.title, viewContent.content);
    win.document.write(html);
    win.document.close();
  };

  const handleSavePrompt = () => {
    savePrompt.mutate({ vacancyId, kind: promptKind, prompt: currentPromptValue });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">AI-звіти по кандидатах вакансії</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openGenerateDialog("candidate_report")}>
            <Sparkles className="h-4 w-4 mr-2" />
            Звіт по кандидату
          </Button>
          <Button size="sm" variant="outline" onClick={() => openGenerateDialog("comparative_report")}>
            <UsersIcon className="h-4 w-4 mr-2" />
            Порівняльний звіт
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Завантаження звітів...</div>
      ) : (reports ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Звітів ще немає
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(reports ?? []).map((report) => (
            <Card key={report.id} className="cursor-pointer hover:bg-muted/40" onClick={() => handleViewReport(report.id)}>
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-medium">
                    {kindLabel[report.kind]}
                    {report.application?.candidate?.full_name ? ` — ${report.application.candidate.full_name}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleString("uk-UA")}
                  </div>
                </div>
                <Badge className={statusColor[report.status]}>{statusLabel[report.status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Промт AI-звіту вакансії</h3>
          <Tabs value={promptKind} onValueChange={(v) => setPromptKind(v as CandidateReportKind)}>
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="candidate_report">По кандидату</TabsTrigger>
              <TabsTrigger value="comparative_report">Порівняльний</TabsTrigger>
            </TabsList>
            <TabsContent value={promptKind} className="pt-4 space-y-2">
              <Label>Системний промт ({kindLabel[promptKind]})</Label>
              <Textarea
                value={currentPromptValue}
                onChange={(e) => setPromptDraft((prev) => ({ ...prev, [promptKind]: e.target.value }))}
                placeholder="Якщо залишити порожнім — використовується дефолтний промт агенції"
                className="min-h-[160px] font-mono text-xs"
              />
              <Button size="sm" onClick={handleSavePrompt} disabled={savePrompt.isPending}>
                {savePrompt.isPending ? "Збереження..." : "Зберегти промт"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Діалог генерації звіту */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{kindLabel[genKind]}</DialogTitle>
            <DialogDescription>
              {genKind === "candidate_report"
                ? "Оберіть заявку, додайте транскрипцію співбесіди та нотатки"
                : "Порівняльний звіт формується по всіх оцінених кандидатах вакансії"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {genKind === "candidate_report" && (
              <div className="space-y-1.5">
                <Label>Заявка кандидата *</Label>
                <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть кандидата" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.candidate?.full_name ?? "Без імені"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {genKind === "candidate_report" && (
              <div className="space-y-1.5">
                <Label>Google Doc транскрипта (URL)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={transcriptDocUrl}
                    onChange={(e) => setTranscriptDocUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    disabled={!selectedApplicationId}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchTranscript}
                    disabled={!selectedApplicationId || !latestInterview || !transcriptDocUrl.trim() || fetchTranscript.isPending}
                  >
                    {fetchTranscript.isPending ? "Завантаження..." : "Підтягнути"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Лише готовий транскрипт (Meet → Transcripts), без розпізнавання мовлення. Потрібна запланована
                  зустріч (кнопка «Зустріч» на картці) — транскрипт привʼязується до найсвіжішого інтервʼю заявки.
                  {selectedApplicationId && !latestInterview && " У цієї заявки ще немає запланованого інтервʼю."}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Транскрипція співбесіди</Label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Вставте транскрипцію інтерв'ю (Google Meet, Zoom тощо) або підтягніть кнопкою вище"
                className="min-h-[140px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Додаткові нотатки</Label>
              <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} className="min-h-[70px]" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGenDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleGenerate} disabled={generateReport.isPending}>
              {generateReport.isPending ? "Генерація..." : "Згенерувати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Діалог перегляду звіту */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewContent?.title}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-words text-sm font-sans bg-muted/30 rounded-md p-4">
            {viewContent?.content}
          </pre>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Копіювати
            </Button>
            <Button type="button" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Завантажити .md
            </Button>
            <Button type="button" variant="outline" onClick={handleOpenClientVersion}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Версія для клієнта
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
