import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, UserPlus, RefreshCw, ExternalLink } from "lucide-react";
import {
  useVacancyMatches,
  useRecommendCandidates,
  matchFlag,
  matchDotClass,
} from "@/hooks/ats/use-candidate-matches";
import { useCreateApplication } from "@/hooks/ats/use-applications";
import { usePermissions } from "@/hooks/ats/use-permissions";

interface RecommendedTabProps {
  vacancyId: string;
  existingCandidateIds: Set<string>;
}

export function RecommendedTab({ vacancyId, existingCandidateIds }: RecommendedTabProps) {
  const { data: matches, isLoading } = useVacancyMatches(vacancyId);
  const recommend = useRecommendCandidates();
  const createApplication = useCreateApplication();
  const { can } = usePermissions();
  const canEdit = can("applications.manage") || can("vacancies.edit");

  const hasMatches = (matches ?? []).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-2xl">
          AI підбирає кандидатів із вашої бази під бріф вакансії й оцінює відповідність 0–100.
          Заповніть бріф/компетенції для точнішого результату, тоді натисніть «Оновити рекомендації».
        </p>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => recommend.mutate(vacancyId)}
            disabled={recommend.isPending}
          >
            {recommend.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Аналіз бази...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {hasMatches ? "Оновити рекомендації" : "Підібрати кандидатів"}
              </>
            )}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
      ) : !hasMatches ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Рекомендацій ще немає</p>
            <p className="text-sm mt-1">Натисніть «Підібрати кандидатів», щоб проаналізувати базу</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(matches ?? []).map((m) => {
            const flag = matchFlag(m.score);
            const inFunnel = existingCandidateIds.has(m.candidate_id);
            return (
              <Card key={m.candidate_id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${matchDotClass[flag]}`} />
                      <span className="text-lg font-semibold tabular-nums">{m.score}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/ats/candidates/${m.candidate_id}`}
                          className="font-medium hover:underline flex items-center gap-1"
                        >
                          {m.full_name ?? "Кандидат"}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {inFunnel && (
                          <Badge variant="outline" className="text-xs">
                            вже у воронці
                          </Badge>
                        )}
                      </div>
                      {m.breakdown.rationale && (
                        <p className="text-sm text-muted-foreground mt-1">{m.breakdown.rationale}</p>
                      )}
                      {(m.breakdown.matched_skills?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.breakdown.matched_skills!.slice(0, 20).map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(m.breakdown.gaps?.length ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Прогалини: {m.breakdown.gaps!.slice(0, 10).join(", ")}
                        </p>
                      )}
                    </div>
                    {canEdit && !inFunnel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="whitespace-nowrap"
                        disabled={createApplication.isPending}
                        onClick={() =>
                          createApplication.mutate({ vacancy_id: vacancyId, candidate_id: m.candidate_id })
                        }
                      >
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        У воронку
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
