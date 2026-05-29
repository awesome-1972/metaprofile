import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { getReport } from "@/lib/reportApi";
import { type AssessmentReport } from "@/lib/api";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  draft: "Чернетка",
  generating: "Генерується",
  ready: "Готовий",
  failed: "Помилка",
};

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  generating: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const difficultyLabel: Record<string, string> = {
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-foreground">
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const ReportPreviewPage = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    const id = parseInt(reportId, 10);
    if (isNaN(id)) {
      setError("Невірний ідентифікатор звіту");
      setIsLoading(false);
      return;
    }
    getReport(id)
      .then(setReport)
      .catch((err: any) => {
        const msg = err.message || "Звіт не знайдено";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setIsLoading(false));
  }, [reportId]);

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </V2AppLayout>
    );
  }

  // ── Error / not found ─────────────────────────────────────────
  if (error || !report) {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/v2/candidate")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            До кабінету
          </button>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>{error || "Звіт не знайдено"}</p>
              <Button className="mt-4" variant="outline" onClick={() => navigate("/v2/candidate")}>
                До кабінету кандидата
              </Button>
            </CardContent>
          </Card>
        </div>
      </V2AppLayout>
    );
  }

  const meta = report.report_data?.metadata;
  const rd = report.report_data;
  const isMock = rd?._mock === true;
  const scoreNum = report.overall_score ? parseFloat(report.overall_score) : null;

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate("/v2/candidate")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          До кабінету
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={statusColor[report.status] || "bg-gray-100 text-gray-700"}>
              {statusLabel[report.status] || report.status}
            </Badge>
            {meta?.difficulty_level && (
              <Badge variant="outline">
                {difficultyLabel[meta.difficulty_level] || meta.difficulty_level}
              </Badge>
            )}
            {report.language && (
              <Badge variant="outline">{report.language.toUpperCase()}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            {meta?.case_title || "Звіт оцінювання"}
          </h1>
          <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            {meta?.candidate_name && <p>Кандидат: <span className="text-foreground">{meta.candidate_name}</span></p>}
            {meta?.candidate_email && <p>Email: {meta.candidate_email}</p>}
            {meta?.company_name && <p>Компанія: <span className="text-foreground">{meta.company_name}</span></p>}
            {meta?.position_title && <p>Позиція: {meta.position_title}</p>}
            {meta?.submitted_at && (
              <p>Здано: {new Date(meta.submitted_at).toLocaleString("uk-UA")}</p>
            )}
            {meta?.time_spent_minutes != null && (
              <p>Час виконання: {meta.time_spent_minutes} хв</p>
            )}
          </div>
        </div>

        {/* Mock notice */}
        {isMock && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="py-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Це демо-звіт із детермінованим аналізом. Реальна AI-оцінка буде доступна у наступній версії.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Overall score */}
        {scoreNum !== null && (
          <Card className="mb-4 border-l-4 border-l-primary">
            <CardContent className="py-4 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Загальний бал</span>
              <span className="text-3xl font-bold text-primary">{scoreNum}</span>
            </CardContent>
          </Card>
        )}

        {/* Executive summary */}
        {report.summary && (
          <Section title="Резюме">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{report.summary}</p>
          </Section>
        )}

        {/* Strengths */}
        {report.strengths?.length > 0 && (
          <Section title="Сильні сторони">
            <BulletList items={report.strengths} />
          </Section>
        )}

        {/* Risks */}
        {report.risks?.length > 0 && (
          <Section title="Ризики та зони розвитку">
            <BulletList items={report.risks} />
          </Section>
        )}

        {/* Recommendations */}
        {report.recommendations?.length > 0 && (
          <Section title="Рекомендації">
            <BulletList items={report.recommendations} />
          </Section>
        )}

        {/* Development plan */}
        {report.development_plan?.length > 0 && (
          <Section title="План розвитку">
            <BulletList items={report.development_plan} />
          </Section>
        )}

        {/* Answer analysis */}
        {rd?.answer_analysis?.length > 0 && (
          <Section title="Аналіз відповідей">
            <div className="space-y-2">
              {rd.answer_analysis.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-1 last:pb-0">
                  <span className="text-foreground">{item.task}</span>
                  <span className="text-muted-foreground">{item.answer_length} символів</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Back button */}
        <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/v2/candidate")}>
          До кабінету кандидата
        </Button>
      </div>
    </V2AppLayout>
  );
};

export default ReportPreviewPage;
