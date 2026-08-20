import { useState } from "react";
import { Loader2, Rss, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useDouMarket } from "@/hooks/ats/use-dou";

interface DouMarketCardProps {
  vacancyId: string;
  canEdit: boolean;
}

/** Моніторинг вакансій DOU (RSS). Ринок/конкуренти під роль; резюме DOU через API недоступні. */
export function DouMarketCard({ vacancyId, canEdit }: DouMarketCardProps) {
  const market = useDouMarket();
  const [showFilters, setShowFilters] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  if (!canEdit) return null;

  const run = () => market.mutate({ vacancyId, keywords: keywords.trim() || undefined, category: category.trim() || undefined, city: city.trim() || undefined });
  const res = market.data;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <Rss className="h-4 w-4 text-muted-foreground" />
            Ринок вакансій (DOU)
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowFilters((v) => !v)}>
              {showFilters ? "Сховати фільтр" : "Фільтр"}
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={run} disabled={market.isPending}>
              {market.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Rss className="h-3.5 w-3.5 mr-1" />}
              Показати ринок
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Ключові слова</Label>
              <Input className="h-8 text-sm" placeholder="за замовч. — назва вакансії" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Категорія DOU</Label>
              <Input className="h-8 text-sm" placeholder="напр. Sales, Marketing" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Місто</Label>
              <Input className="h-8 text-sm" placeholder="напр. Київ" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
        )}

        {res && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Показано {res.jobs.length}{res.query.keywords ? ` · за «${res.query.keywords}»` : ""}{res.query.category ? ` · ${res.query.category}` : ""}
            </p>
            {res.jobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нічого не знайдено. Спробуйте змінити фільтр або категорію.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {res.jobs.map((j, i) => (
                  <li key={i} className="p-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium min-w-0">{j.title}</div>
                      {j.link && (
                        <a href={j.link} target="_blank" rel="noopener noreferrer" title="Відкрити вакансію" className="text-muted-foreground hover:text-foreground shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {j.snippet && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{j.snippet}</p>}
                    {j.updated && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{j.updated}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!res && (
          <p className="text-xs text-muted-foreground">
            Вакансії DOU під цю роль (RSS-фіди, легально). Резюме DOU через API недоступні — тут лише моніторинг ринку/конкурентів.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
