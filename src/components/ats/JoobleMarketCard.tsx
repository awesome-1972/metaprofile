import { useState } from "react";
import { Loader2, TrendingUp, ExternalLink, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useJoobleMarket } from "@/hooks/ats/use-jooble";

interface JoobleMarketCardProps {
  vacancyId: string;
  canEdit: boolean;
}

/** Моніторинг ринку вакансій (Jooble): вакансії конкурентів під цю роль, вилки, регіони. */
export function JoobleMarketCard({ vacancyId, canEdit }: JoobleMarketCardProps) {
  const market = useJoobleMarket();
  const [showFilters, setShowFilters] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");

  if (!canEdit) return null;

  const run = () => market.mutate({ vacancyId, keywords: keywords.trim() || undefined, location: location.trim() || undefined });
  const res = market.data;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Ринок вакансій (Jooble)
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowFilters((v) => !v)}>
              {showFilters ? "Сховати фільтр" : "Фільтр"}
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={run} disabled={market.isPending}>
              {market.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5 mr-1" />}
              Показати ринок
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Ключові слова</Label>
              <Input className="h-8 text-sm" placeholder="за замовч. — назва вакансії" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Локація</Label>
              <Input className="h-8 text-sm" placeholder="за замовч. — гео вакансії" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
        )}

        {res && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Знайдено на ринку: {res.total} · показано {res.jobs.length}
              {res.query.keywords ? ` · за «${res.query.keywords}»` : ""}{res.query.location ? ` · ${res.query.location}` : ""}
            </p>
            {res.jobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нічого не знайдено. Спробуйте змінити фільтр.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {res.jobs.map((j, i) => (
                  <li key={i} className="p-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{j.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                          {j.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{j.company}</span>}
                          {j.location && <span>{j.location}</span>}
                          {j.source && <span className="opacity-70">· {j.source}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {j.salary && <Badge variant="outline" className="text-[10px] whitespace-nowrap">{j.salary}</Badge>}
                        {j.link && (
                          <a href={j.link} target="_blank" rel="noopener noreferrer" title="Відкрити вакансію" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    {j.snippet && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{j.snippet}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!res && (
          <p className="text-xs text-muted-foreground">
            Аналіз ринку: вакансії конкурентів під цю роль, зарплатні вилки й попит по регіонах. За замовчуванням шукаємо за назвою й гео цієї вакансії.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
