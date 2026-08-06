import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";
import { useCandidates } from "@/hooks/ats/use-candidates";
import { DuplicateCandidatesDialog } from "@/components/ats/DuplicateCandidatesDialog";

// Дістати навички кандидата з resume_parsed (jsonb) або тегів.
function candidateSkills(c: unknown): string[] {
  const rp = (c as { resume_parsed?: { skills?: unknown } }).resume_parsed;
  const s = rp?.skills;
  return Array.isArray(s) ? (s.filter((x) => typeof x === "string") as string[]) : [];
}
function candidateTags(c: unknown): string[] {
  const t = (c as { tags?: unknown }).tags;
  return Array.isArray(t) ? (t.filter((x) => typeof x === "string") as string[]) : [];
}

const CandidatesListPage = () => {
  const navigate = useNavigate();
  const { data: allCandidates, isLoading, isError, error } = useCandidates();

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [onlyFree, setOnlyFree] = useState(false);

  const list = allCandidates ?? [];

  const allSources = useMemo(() => {
    const set = new Map<string, string>();
    list.forEach((c) => { if (c.source?.name) set.set(c.source.name, c.source.name); });
    return [...set.keys()].sort();
  }, [list]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    list.forEach((c) => candidateTags(c).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [list]);

  const toggleTag = (t: string) =>
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (sourceFilter !== "all" && c.source?.name !== sourceFilter) return false;
      if (onlyFree && c.applications_refs.length > 0) return false;
      if (activeTags.size > 0) {
        const tags = new Set(candidateTags(c));
        for (const t of activeTags) if (!tags.has(t)) return false;
      }
      if (q) {
        const hay = [
          c.full_name,
          c.email,
          (c as { headline?: string | null }).headline,
          (c as { current_company?: string | null }).current_company,
          candidateSkills(c).join(" "),
          candidateTags(c).join(" "),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, search, sourceFilter, onlyFree, activeTags]);

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Talent CRM</h1>
          <p className="text-muted-foreground mt-1">Приватний пул кандидатів — пошук за навичками, тегами й джерелом</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Пошук: ім'я, email, посада, навички, теги…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Джерело" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі джерела</SelectItem>
              {allSources.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={onlyFree ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyFree((v) => !v)}
          >
            Без вакансій
          </Button>
          <DuplicateCandidatesDialog candidates={list} />
          <span className="text-sm text-muted-foreground ml-auto">Показано: {filtered.length} із {list.length}</span>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  activeTags.has(t) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Не вдалося завантажити кандидатів"}
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{list.length === 0 ? "Ще немає кандидатів" : "Нічого не знайдено за фільтрами"}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Кандидат</TableHead>
                  <TableHead>Посада / компанія</TableHead>
                  <TableHead>Навички</TableHead>
                  <TableHead>Джерело</TableHead>
                  <TableHead>Вакансії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((candidate) => {
                  const skills = candidateSkills(candidate);
                  const tags = candidateTags(candidate);
                  return (
                    <TableRow
                      key={candidate.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/ats/candidates/${candidate.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {candidate.full_name}
                          {candidate.is_anonymized && (
                            <Badge variant="outline" className="text-[10px]">знеособлено</Badge>
                          )}
                          {tags.map((t) => (
                            <Badge key={t} className="text-[10px] bg-purple-100 text-purple-800 font-normal">{t}</Badge>
                          ))}
                        </div>
                        {candidate.email && <div className="text-xs text-muted-foreground mt-0.5">{candidate.email}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{(candidate as { headline?: string | null }).headline || "—"}</div>
                        {(candidate as { current_company?: string | null }).current_company && (
                          <div className="text-xs text-muted-foreground">{(candidate as { current_company?: string | null }).current_company}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                        {skills.length > 0 ? skills.slice(0, 6).join(", ") : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{candidate.source?.name || "—"}</TableCell>
                      <TableCell>
                        {candidate.applications_refs.length === 0 ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">вільний</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {candidate.applications_refs.map((a) =>
                              a.vacancy ? (
                                <Badge
                                  key={a.id}
                                  variant="secondary"
                                  className="cursor-pointer text-[10px] font-normal hover:bg-secondary/70"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/ats/vacancies/${a.vacancy!.id}`); }}
                                >
                                  {a.vacancy.title}
                                </Badge>
                              ) : null,
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AtsLayout>
  );
};

export default CandidatesListPage;
