import { useState } from "react";
import { Ban, Database, ExternalLink, Loader2, MoreHorizontal, Search, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useRunSourcing,
  useSourcedProfiles,
  useImportSourcedProfile,
  useAddSourcedToVacancy,
  useDismissSourcedProfile,
  useClearSourcing,
  type SourcingProvider,
  type SourcedProfile,
} from "@/hooks/ats/use-sourcing";
import { matchFlag, matchDotClass } from "@/hooks/ats/use-candidate-matches";
import { WorkuaResponsesCard } from "@/components/ats/WorkuaResponsesCard";
import { RobotaResponsesCard } from "@/components/ats/RobotaResponsesCard";

const PROVIDERS: { id: SourcingProvider; label: string }[] = [
  { id: "robotaua", label: "Robota.ua" },
  { id: "workua", label: "Work.ua" },
  { id: "github", label: "GitHub" },
  { id: "pdl", label: "People Data Labs" },
  { id: "apollo", label: "Apollo" },
  { id: "proxycurl", label: "Proxycurl" },
];

interface SourcingTabProps {
  vacancyId: string;
  canEdit: boolean;
}

export function SourcingTab({ vacancyId, canEdit }: SourcingTabProps) {
  const { data: saved, isLoading } = useSourcedProfiles(vacancyId);
  const runSourcing = useRunSourcing();
  const importProfile = useImportSourcedProfile();
  const addToVacancy = useAddSourcedToVacancy();
  const dismissProfile = useDismissSourcedProfile();
  const clearSourcing = useClearSourcing();

  const [selected, setSelected] = useState<Set<SourcingProvider>>(new Set(["github"]));
  const [keywords, setKeywords] = useState("");
  const [locations, setLocations] = useState("");
  const [skills, setSkills] = useState("");

  const toggle = (p: SourcingProvider) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const run = () => {
    runSourcing.mutate({
      vacancyId,
      providers: [...selected],
      query: {
        keywords: keywords.trim() || undefined,
        locations: locations.trim() ? locations.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        skills: skills.trim() ? skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      },
    });
  };

  const result = runSourcing.data;
  // Показуємо збережені профілі (мають id для дій «У вакансію»/«Відхилити»);
  // свіжий пошук лише інвалідовує кеш, і список підтягується оновленим.
  const profiles: SourcedProfile[] = saved ?? [];

  return (
    <div className="space-y-5">
      <WorkuaResponsesCard vacancyId={vacancyId} canEdit={canEdit} />
      <RobotaResponsesCard vacancyId={vacancyId} canEdit={canEdit} />

      {canEdit && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-xs">Джерела</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selected.has(p.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="src-keywords" className="text-xs">Ключові слова</Label>
                <Input id="src-keywords" className="h-8 text-sm" placeholder="напр. React senior" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="src-skills" className="text-xs">Навички (через кому)</Label>
                <Input id="src-skills" className="h-8 text-sm" placeholder="React, TypeScript" value={skills} onChange={(e) => setSkills(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="src-loc" className="text-xs">Локації (через кому)</Label>
                <Input id="src-loc" className="h-8 text-sm" placeholder="Kyiv, Ukraine" value={locations} onChange={(e) => setLocations(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={run} disabled={runSourcing.isPending || selected.size === 0}>
                {runSourcing.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
                Знайти кандидатів
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setKeywords(""); setSkills(""); setLocations(""); setSelected(new Set(["github"]));
                  runSourcing.reset();
                  if (profiles.length > 0 && window.confirm("Приховати всі знайдені профілі цієї вакансії?")) {
                    clearSourcing.mutate(vacancyId);
                  }
                }}
                disabled={clearSourcing.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Очистити пошук
              </Button>
              <p className="text-xs text-muted-foreground">
                Порожні поля беруться з бріфу вакансії (назва, компетенції, гео).
              </p>
            </div>

            {result && (result.skipped.length > 0 || Object.keys(result.errors).length > 0) && (
              <div className="text-xs text-muted-foreground space-y-1">
                {result.skipped.length > 0 && (
                  <p>Пропущено (немає API-ключа): {result.skipped.join(", ")}. Ключі додаються в секрети Supabase.</p>
                )}
                {Object.entries(result.errors).map(([prov, msg]) => (
                  <p key={prov} className="text-amber-600">{prov}: {msg}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Завантаження…</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Ще немає знайдених профілів. Запустіть пошук за джерелами вище.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="p-2 w-16">Збіг</th>
                <th className="p-2">Кандидат</th>
                <th className="p-2 w-28">Джерело</th>
                <th className="p-2 w-40">Локація</th>
                <th className="p-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={`${p.provider}:${p.external_id}`} className="border-t align-top">
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${matchDotClass[matchFlag(p.match_score)]}`} />
                      {p.match_score}%
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{p.full_name ?? "Без імені"}</div>
                    {p.title && <div className="text-xs text-muted-foreground">{p.title}</div>}
                    {p.company && <div className="text-xs text-muted-foreground">{p.company}</div>}
                    {p.skills.length > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.skills.slice(0, 8).join(", ")}</div>
                    )}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-[10px]">{p.provider}</Badge>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{p.location ?? "—"}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1 justify-end">
                      {p.profile_url && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={p.profile_url} target="_blank" rel="noopener noreferrer" title="Відкрити профіль">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {canEdit && (p.candidate_id ? (
                        <Badge className="text-[10px] bg-green-100 text-green-800">У базі</Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={addToVacancy.isPending}
                            onClick={() => addToVacancy.mutate({ vacancyId, profile: p })}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            У вакансію
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                disabled={importProfile.isPending}
                                onClick={() => importProfile.mutate({ vacancyId, profile: p })}
                              >
                                <Database className="h-3.5 w-3.5 mr-2" />
                                Додати в базу
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={!p.id || dismissProfile.isPending}
                                onClick={() => p.id && dismissProfile.mutate({ vacancyId, profileId: p.id })}
                              >
                                <Ban className="h-3.5 w-3.5 mr-2" />
                                Відхилити
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
