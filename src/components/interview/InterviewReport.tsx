import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  FileText,
  Download,
  Share2,
  Info,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface InterviewReportProps {
  report: any;
  positionTitle: string;
  companyName: string;
  interviewType: "training" | "real";
  onClose: () => void;
  onSendToCompany?: () => void;
}

export const InterviewReport = ({
  report,
  positionTitle,
  companyName,
  interviewType,
  onClose,
  onSendToCompany,
}: InterviewReportProps) => {
  const getRecommendationConfig = (rec: string) => {
    switch (rec) {
      case "strong_hire":
        return { label: "Сильний Hire", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle2 };
      case "hire":
        return { label: "Hire", color: "text-green-500", bg: "bg-green-50", icon: ThumbsUp };
      case "maybe":
        return { label: "Maybe", color: "text-yellow-600", bg: "bg-yellow-50", icon: AlertCircle };
      case "no_hire":
        return { label: "No Hire", color: "text-red-600", bg: "bg-red-50", icon: ThumbsDown };
      default:
        return { label: "Невизначено", color: "text-muted-foreground", bg: "bg-muted", icon: AlertCircle };
    }
  };

  const recConfig = getRecommendationConfig(report.recommendation);
  const RecIcon = recConfig.icon;

  const radarData = [
    { subject: "Технічні", value: report.technicalFit || 70, fullMark: 100 },
    { subject: "Soft Skills", value: report.softSkillsFit || 75, fullMark: 100 },
    { subject: "Culture Fit", value: report.cultureFit || 72, fullMark: 100 },
    { subject: "Комунікація", value: Math.round((report.technicalFit + report.softSkillsFit) / 2) || 73, fullMark: 100 },
    { subject: "Потенціал", value: report.overallScore || 75, fullMark: 100 },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Звіт про співбесіду
          </h1>
          <p className="text-muted-foreground">
            {positionTitle} • {companyName}
          </p>
          <Badge variant={interviewType === "real" ? "destructive" : "secondary"} className="mt-2">
            {interviewType === "real" ? "Офіційна співбесіда" : "Тренувальна співбесіда"}
          </Badge>
        </div>

        {/* Overall Score & Recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Score */}
          <div className="rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Загальний бал</p>
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32">
                <circle
                  className="text-muted"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="56"
                  cx="64"
                  cy="64"
                />
                <circle
                  className="text-primary"
                  strokeWidth="8"
                  strokeDasharray={`${(report.overallScore / 100) * 352} 352`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="56"
                  cx="64"
                  cy="64"
                  transform="rotate(-90 64 64)"
                />
              </svg>
              <span className="absolute text-3xl font-bold text-foreground">
                {report.overallScore}%
              </span>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`rounded-lg border border-border p-6 text-center ${recConfig.bg}`}>
            <p className="text-sm text-muted-foreground mb-2">Рекомендація</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <RecIcon className={`h-10 w-10 ${recConfig.color}`} />
              <span className={`text-2xl font-bold ${recConfig.color}`}>
                {recConfig.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.recommendationRationale}
            </p>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="rounded-lg border border-border p-6 mb-8">
          <h2 className="text-lg font-medium text-foreground mb-4">Профіль кандидата</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Результат"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Технічні навички</span>
            </div>
            <Progress value={report.technicalFit || 70} className="mb-2" />
            <p className="text-2xl font-bold text-foreground">{report.technicalFit || 70}%</p>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-chart-2" />
              <span className="text-sm font-medium text-foreground">Soft Skills</span>
            </div>
            <Progress value={report.softSkillsFit || 75} className="mb-2" />
            <p className="text-2xl font-bold text-foreground">{report.softSkillsFit || 75}%</p>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-chart-3" />
              <span className="text-sm font-medium text-foreground">Culture Fit</span>
            </div>
            <Progress value={report.cultureFit || 72} className="mb-2" />
            <p className="text-2xl font-bold text-foreground">{report.cultureFit || 72}%</p>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <div className="rounded-lg border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-foreground">Сильні сторони</h3>
            </div>
            <ul className="space-y-2">
              {(report.strengths || ["Технічна компетентність", "Комунікабельність"]).map(
                (strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{strength}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="rounded-lg border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-foreground">Зони для розвитку</h3>
            </div>
            <ul className="space-y-2">
              {(report.weaknesses || ["Потребує більше досвіду лідерства"]).map(
                (weakness: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{weakness}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Development Suggestions */}
        <div className="rounded-lg border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">Рекомендації для розвитку</h3>
          </div>
          <ul className="space-y-2">
            {(report.developmentSuggestions || ["Продовжувати розвивати технічні навички"]).map(
              (suggestion: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  <span className="text-sm text-foreground">{suggestion}</span>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-border p-6 mb-8 bg-accent/30">
          <h3 className="font-medium text-foreground mb-3">Підсумок</h3>
          <p className="text-sm text-muted-foreground">
            {report.summary || "Кандидат продемонстрував хороший рівень підготовки та мотивації."}
          </p>
        </div>

        {/* AI Transparency */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-8">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Аналітика з AI-підтримкою
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Цей звіт створено за допомогою AI-аналізу відповідей під час співбесіди.
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer text-primary hover:underline">
                  Як це було розраховано
                </summary>
                <div className="mt-2 p-2 rounded bg-background/50 text-muted-foreground">
                  <p className="mb-1">
                    <strong>Методологія:</strong> Аналіз базується на оцінці відповідей за моделлю STAR
                    (Situation, Task, Action, Result) та порівнянні з моделлю компетенцій позиції.
                  </p>
                  <p className="mb-1">
                    <strong>Чинники:</strong> Враховано структурованість відповідей, релевантність
                    прикладів, глибину технічних знань та soft skills.
                  </p>
                  <p>
                    <strong>Обмеження:</strong> AI не може бути фінальним рішенням. Результати
                    слугують орієнтиром для HR-спеціалістів.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          {interviewType === "real" && onSendToCompany && (
            <Button onClick={onSendToCompany} className="gap-2">
              <Share2 className="h-4 w-4" />
              Надіслати компанії
            </Button>
          )}
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Завантажити PDF
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Закрити
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};
