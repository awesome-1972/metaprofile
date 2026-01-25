import { useState, useEffect } from "react";
import { 
  GraduationCap, Clock, PlayCircle, CheckCircle2, 
  ExternalLink, Sparkles, RefreshCw, Star, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCourseRecommendations, Course } from "@/hooks/useCourseRecommendations";

interface CareerLevel {
  level: string;
  timeframe: string;
  salaryRange: string;
}

interface CareerPathWithAICoursesProps {
  role: string;
  area: string;
}

const staticLevels: CareerLevel[] = [
  { level: "Junior", timeframe: "Старт", salaryRange: "15-30k" },
  { level: "Middle", timeframe: "2-4 роки", salaryRange: "35-55k" },
  { level: "Senior", timeframe: "4-6 років", salaryRange: "60-85k" },
  { level: "Lead", timeframe: "6+ років", salaryRange: "90-120k+" },
];

const getCourseTypeColor = (type: string) => {
  switch (type) {
    case "Базовий": return "bg-primary/10 text-primary border-primary/20";
    case "Практика": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "Soft skills": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "Просунутий": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Менеджмент": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "Експертний": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "Лідерство": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "Стратегія": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "Бізнес": return "bg-teal-500/10 text-teal-600 border-teal-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

export function CareerPathWithAICourses({ role, area }: CareerPathWithAICoursesProps) {
  const { courseLevels, fetchCoursesForLevel } = useCourseRecommendations();
  const [loadedLevels, setLoadedLevels] = useState<Set<string>>(new Set());
  const [isAIMode, setIsAIMode] = useState(false);

  const loadCoursesForLevel = async (level: string) => {
    const key = `${role}-${level}`;
    if (!loadedLevels.has(key)) {
      await fetchCoursesForLevel(role, level, area);
      setLoadedLevels(prev => new Set(prev).add(key));
    }
  };

  const loadAllCourses = async () => {
    setIsAIMode(true);
    for (const levelData of staticLevels) {
      await loadCoursesForLevel(levelData.level);
    }
  };

  const getCourses = (level: string): { courses: Course[], isLoading: boolean } => {
    const key = `${role}-${level}`;
    const data = courseLevels[key];
    if (data) {
      return { courses: data.courses, isLoading: data.isLoading };
    }
    // Return static fallback
    return { courses: getStaticCourses(level), isLoading: false };
  };

  const totalCourses = isAIMode 
    ? staticLevels.reduce((acc, l) => {
        const { courses } = getCourses(l.level);
        return acc + courses.length;
      }, 0)
    : staticLevels.reduce((acc, l) => acc + getStaticCourses(l.level).length, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-foreground">Кар'єрний шлях та навчання</h3>
          {isAIMode && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              <span>AI-рекомендації</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <GraduationCap className="h-3 w-3 mr-1" />
            {totalCourses} курсів
          </Badge>
          {!isAIMode && (
            <Button variant="outline" size="sm" onClick={loadAllCourses}>
              <Sparkles className="h-4 w-4 mr-1" />
              AI-курси
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        {staticLevels.map((levelData, index) => {
          const { courses, isLoading } = getCourses(levelData.level);
          
          return (
            <div key={levelData.level} className="relative">
              {/* Level Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  index === 0 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${index === 0 ? "text-primary" : "text-foreground"}`}>
                      {levelData.level}
                    </h4>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{levelData.timeframe}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Зарплата: ${levelData.salaryRange}/рік</p>
                </div>
                {index === 0 && (
                  <Badge className="bg-primary/10 text-primary border-0">Ваш старт</Badge>
                )}
              </div>

              {/* Courses for this level */}
              <div className="ml-14 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Рекомендовані курси для переходу на наступний рівень:
                </p>
                
                {isLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Генеруємо рекомендації...</span>
                  </div>
                ) : (
                  courses.map((course, courseIndex) => (
                    <a
                      key={courseIndex}
                      href={course.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-background">
                          <PlayCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {course.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {course.duration}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{course.platform}</span>
                            {course.rating && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                  {course.rating}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getCourseTypeColor(course.type)}`}>
                          {course.type}
                        </Badge>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))
                )}
              </div>

              {/* Connector line */}
              {index < staticLevels.length - 1 && (
                <div className="absolute left-5 top-14 w-0.5 h-[calc(100%-2rem)] bg-border" />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 rounded-md bg-primary/5 border border-primary/10">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isAIMode ? "AI-персоналізований план навчання" : "Персоналізований план навчання"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAIMode 
                ? `Курси підібрані AI спеціально для ролі "${role}". Натисніть на курс для переходу до платформи.`
                : "Проходьте курси послідовно для оптимального кар'єрного росту. Середній час до рівня Middle — 2-3 роки активного навчання та практики."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStaticCourses(level: string): Course[] {
  const fallbackByLevel: Record<string, Course[]> = {
    "Junior": [
      { title: "Основи професії", duration: "4 тижні", type: "Базовий", platform: "Coursera" },
      { title: "Практичні інструменти", duration: "3 тижні", type: "Практика", platform: "Udemy" },
      { title: "Soft skills для початківців", duration: "2 тижні", type: "Soft skills", platform: "LinkedIn Learning" },
    ],
    "Middle": [
      { title: "Поглиблені технології", duration: "6 тижнів", type: "Просунутий", platform: "Pluralsight" },
      { title: "Проектний менеджмент", duration: "4 тижні", type: "Менеджмент", platform: "Coursera" },
      { title: "Комунікація в команді", duration: "3 тижні", type: "Soft skills", platform: "Skillshare" },
    ],
    "Senior": [
      { title: "Архітектура та системний дизайн", duration: "8 тижнів", type: "Експертний", platform: "O'Reilly" },
      { title: "Технічне лідерство", duration: "5 тижнів", type: "Лідерство", platform: "LinkedIn Learning" },
      { title: "Менторинг та наставництво", duration: "4 тижні", type: "Soft skills", platform: "Udemy" },
    ],
    "Lead": [
      { title: "Стратегічне управління", duration: "6 тижнів", type: "Стратегія", platform: "Harvard Online" },
      { title: "Управління командами", duration: "5 тижнів", type: "Менеджмент", platform: "Coursera" },
      { title: "Бізнес-аналітика для лідерів", duration: "4 тижні", type: "Бізнес", platform: "MIT OpenCourseWare" },
    ],
  };

  return fallbackByLevel[level] || fallbackByLevel["Junior"];
}
