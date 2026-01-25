import { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Info, Target, TrendingUp, AlertTriangle } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetaprogramData {
  name: string;
  fullName: string;
  userValue: number;
  referenceValue: number;
  userLabel: string;
  description: string;
}

const metaprogramsData: MetaprogramData[] = [
  {
    name: "Мотивація",
    fullName: "Мотивація: До/Від",
    userValue: 78,
    referenceValue: 85,
    userLabel: "До цілі",
    description: "Орієнтація на досягнення цілей vs уникнення проблем",
  },
  {
    name: "Референція",
    fullName: "Референція: Внутрішня/Зовнішня",
    userValue: 65,
    referenceValue: 70,
    userLabel: "Внутрішня",
    description: "Джерело критеріїв для прийняття рішень",
  },
  {
    name: "Масштаб",
    fullName: "Масштаб: Загальний/Деталі",
    userValue: 82,
    referenceValue: 75,
    userLabel: "Деталі",
    description: "Фокус на загальній картині vs конкретних деталях",
  },
  {
    name: "Час",
    fullName: "Орієнтація в часі",
    userValue: 70,
    referenceValue: 80,
    userLabel: "Майбутнє",
    description: "Фокус на минулому, теперішньому чи майбутньому",
  },
  {
    name: "Стиль",
    fullName: "Стиль діяльності",
    userValue: 88,
    referenceValue: 82,
    userLabel: "Проактивний",
    description: "Проактивний підхід vs реактивне реагування",
  },
  {
    name: "Рішення",
    fullName: "Прийняття рішень",
    userValue: 75,
    referenceValue: 78,
    userLabel: "Варіанти",
    description: "Орієнтація на варіанти vs процедури",
  },
];

const selectedProfession = "Senior Software Engineer";

export const MetaprogramsAnalysis = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const chartData = metaprogramsData.map((item) => ({
    subject: item.name,
    user: item.userValue,
    reference: item.referenceValue,
    fullMark: 100,
  }));

  const getMatchScore = () => {
    const totalDiff = metaprogramsData.reduce(
      (acc, item) => acc + Math.abs(item.userValue - item.referenceValue),
      0
    );
    const maxDiff = metaprogramsData.length * 100;
    return Math.round(100 - (totalDiff / maxDiff) * 100);
  };

  const getGapAnalysis = () => {
    return metaprogramsData
      .map((item) => ({
        ...item,
        gap: item.referenceValue - item.userValue,
      }))
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  };

  const matchScore = getMatchScore();
  const gapAnalysis = getGapAnalysis();

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-foreground">Ваші метапрограми</h2>
          <Badge variant="outline" className="text-xs">
            Порівняння з: {selectedProfession}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          {isExpanded ? (
            <>
              Згорнути <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Детальний аналіз <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Compact view */}
      {!isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {metaprogramsData.map((item, index) => (
            <div key={index} className="text-center p-3 rounded-md bg-accent/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {item.name}
              </p>
              <p className="text-sm font-medium text-foreground mb-2">{item.userLabel}</p>
              <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${item.userValue}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Match score and legend */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Overall match */}
            <div className="flex-shrink-0 p-4 rounded-lg bg-accent/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Відповідність профілю
                </span>
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{matchScore}%</div>
              <p className="text-xs text-muted-foreground">
                з еталоном {selectedProfession}
              </p>
            </div>

            {/* Legend */}
            <div className="flex-1 p-4 rounded-lg border border-border">
              <p className="text-sm font-medium text-foreground mb-3">Легенда діаграми</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Ваш профіль</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-chart-2" />
                  <span className="text-sm text-muted-foreground">
                    Еталон ({selectedProfession})
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Чим ближче ваш профіль до еталону, тим вища відповідність позиції
              </p>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="rounded-lg border border-border p-4">
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Radar
                  name="Еталон"
                  dataKey="reference"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar
                  name="Ваш профіль"
                  dataKey="user"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  formatter={(value) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                        <p className="font-medium text-foreground mb-2">{label}</p>
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium text-foreground">{entry.value}%</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Gap Analysis */}
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Аналіз розбіжностей</h3>
              <UITooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Показує різницю між вашими показниками та еталонним профілем для обраної
                    професії. Позитивні значення означають, що ви перевищуєте еталон.
                  </p>
                </TooltipContent>
              </UITooltip>
            </div>

            <div className="space-y-3">
              {gapAnalysis.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-28 flex-shrink-0">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.userLabel}</p>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden relative">
                        {/* Center line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/50" />
                        
                        {/* Gap bar */}
                        <div
                          className={`absolute top-0 bottom-0 ${
                            item.gap > 0 ? "bg-chart-2" : "bg-primary"
                          }`}
                          style={{
                            left: item.gap > 0 ? "50%" : `${50 + item.gap / 2}%`,
                            width: `${Math.abs(item.gap) / 2}%`,
                          }}
                        />
                      </div>

                      <div className="w-16 text-right">
                        <span
                          className={`text-sm font-medium ${
                            item.gap > 0
                              ? "text-chart-2"
                              : item.gap < 0
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.gap > 0 ? "+" : ""}
                          {item.gap}
                        </span>
                      </div>
                    </div>
                  </div>

                  {Math.abs(item.gap) > 10 && (
                    <UITooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Значна розбіжність з еталоном</p>
                      </TooltipContent>
                    </UITooltip>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Detailed descriptions */}
          <div className="rounded-lg border border-border p-4">
            <h3 className="font-medium text-foreground mb-4">Детальний опис метапрограм</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metaprogramsData.map((item, index) => (
                <div key={index} className="p-3 rounded-md bg-accent/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{item.fullName}</p>
                    <Badge
                      variant={
                        Math.abs(item.referenceValue - item.userValue) <= 5
                          ? "default"
                          : "secondary"
                      }
                    >
                      {item.userValue}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ваше значення:</span>
                    <span className="font-medium text-foreground">{item.userLabel}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-muted-foreground">Еталон:</span>
                    <span className="font-medium text-chart-2">{item.referenceValue}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Transparency block */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Аналітика з AI-підтримкою
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Еталонний профіль створено на основі аналізу успішних спеціалістів на позиції{" "}
                  {selectedProfession}.
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-primary hover:underline">
                    Як це було розраховано
                  </summary>
                  <div className="mt-2 p-2 rounded bg-background/50 text-muted-foreground">
                    <p className="mb-1">
                      <strong>Методологія:</strong> Аналіз базується на опитуванні 500+ успішних
                      спеціалістів та порівнянні їх метапрограмних профілів.
                    </p>
                    <p className="mb-1">
                      <strong>Чинники:</strong> Враховано галузь, рівень позиції, тип компанії та
                      регіон.
                    </p>
                    <p>
                      <strong>Обмеження:</strong> AI не може бути фінальним рішенням. Результати
                      слугують орієнтиром для саморозвитку.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
