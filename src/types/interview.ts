/**
 * Типи віртуального інтервʼю (V1-демо).
 *
 * Раніше звіт і STAR-оцінки ходили по коду як `any` — компілятор не ловив
 * жодної помилки в полях. Форма звіту збігається з `AIAnalysisResult` у
 * `useCases` (та сама модель генерує обидва), але дублювати імпорт між
 * демо-модулями не хочеться, тому канонічний тип живе тут.
 */

/** Рекомендація за підсумком інтервʼю. */
export type InterviewRecommendation = "strong_hire" | "hire" | "maybe" | "no_hire";

/** Звіт AI-інтервʼюера. */
export interface InterviewReportData {
  overallScore: number;
  recommendation: InterviewRecommendation | string;
  recommendationRationale: string;
  strengths: string[];
  weaknesses: string[];
  cultureFit: number;
  technicalFit: number;
  softSkillsFit: number;
  developmentSuggestions: string[];
  summary: string;
}

/** Оцінка окремої відповіді за схемою STAR (Situation-Task-Action-Result). */
export interface StarEvaluation {
  questionId: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  score?: number;
  comment?: string;
}

/** Те, що інтервʼю віддає назовні по завершенні. */
export interface InterviewCompletionResult {
  report: InterviewReportData | null;
  messages: Array<{ role: string; content: string }>;
}
