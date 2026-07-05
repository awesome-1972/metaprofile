// src/components/ats/ReportsTab.tsx
//
// Вкладка "Звіти" — список candidate_reports вакансії, кнопки "Звіт по
// кандидату" / "Порівняльний звіт" (виклик Edge generate-candidate-report),
// перегляд звіту (markdown без нових залежностей — <pre> whitespace-pre-wrap),
// копіювання і завантаження .md, редактор промту вакансії (vacancy_prompts).
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { FileText, Copy, Download, Sparkles, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useCandidateReports,
  useGenerateCandidateReport,
  type CandidateReportKind,
} from "@/hooks/ats/use-candidate-reports";
import { useVacancyPrompts, useSaveVacancyPrompt } from "@/hooks/ats/use-vacancy-prompts";
import type { ApplicationWithCandidate } from "@/hooks/ats/use-applications";

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
    setGenDialogOpen(true);
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
            <div className="space-y-1.5">
              <Label>Транскрипція співбесіди</Label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Вставте транскрипцію інтерв'ю (Google Meet, Zoom тощо)"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
