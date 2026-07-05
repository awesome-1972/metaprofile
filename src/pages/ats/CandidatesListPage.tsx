import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { useCandidates, useSearchCandidates } from "@/hooks/ats/use-candidates";

const CandidatesListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: allCandidates, isLoading, isError, error } = useCandidates();
  const { data: searchResults, isLoading: searchLoading } = useSearchCandidates(search);

  const isSearching = search.trim().length > 0;
  const candidates = useMemo(
    () => (isSearching ? searchResults ?? [] : allCandidates ?? []),
    [isSearching, searchResults, allCandidates],
  );
  const loading = isSearching ? searchLoading : isLoading;

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Кандидати</h1>
          <p className="text-muted-foreground mt-1">Усі кандидати, доступні вам</p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук за іменем або email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : isError && !isSearching ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Не вдалося завантажити кандидатів"}
            </CardContent>
          </Card>
        ) : candidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{isSearching ? "Нічого не знайдено" : "Ще немає кандидатів"}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Імʼя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Джерело</TableHead>
                  <TableHead>Заявок</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow
                    key={candidate.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ats/candidates/${candidate.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {candidate.full_name}
                        {candidate.is_anonymized && (
                          <Badge variant="outline" className="text-xs">
                            знеособлено
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{candidate.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{candidate.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{candidate.source?.name || "—"}</TableCell>
                    <TableCell>{candidate.applications_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AtsLayout>
  );
};

export default CandidatesListPage;
