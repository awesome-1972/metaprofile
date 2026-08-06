// src/lib/ats/competency-scale.ts
//
// Редаговані пороги рівнів відповідності (шкала оцінки компетенцій 1–3).
// Дефолт — дашбордний (Сильна ≥2.5 / Хороша ≥2.0 / нижче — низька). Користувач
// змінює на вакансії (vacancies.competency_scale). Edge generate-candidate-report
// використовує ті самі значення.

export interface CompetencyScale {
  high: number;
  medium: number;
}

export const DEFAULT_COMPETENCY_SCALE: CompetencyScale = { high: 2.5, medium: 2.0 };

/** Нормалізувати збережений jsonb у валідну шкалу (з фолбеком на дефолт). */
export function toCompetencyScale(raw: unknown): CompetencyScale {
  const o = (raw ?? {}) as { high?: unknown; medium?: unknown };
  const high = typeof o.high === "number" && o.high > 0 ? o.high : DEFAULT_COMPETENCY_SCALE.high;
  const medium = typeof o.medium === "number" && o.medium > 0 ? o.medium : DEFAULT_COMPETENCY_SCALE.medium;
  return { high, medium: Math.min(medium, high) };
}

export function verdictFromScore(score: number, scale: CompetencyScale): string {
  if (score >= scale.high) return "висока відповідність";
  if (score >= scale.medium) return "середня відповідність";
  return "низька відповідність";
}
