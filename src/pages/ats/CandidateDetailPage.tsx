import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Briefcase, Building2, Mail, Phone, Linkedin, MapPin, Users, Clock } from "lucide-react";
import { useCandidate } from "@/hooks/ats/use-candidates";
import {
  useApplicationsByCandidate,
  useCandidateApplicationEvents,
  useLogApplicationEvent,
} from "@/hooks/ats/use-applications";
import type { Database } from "@/integrations/supabase/types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];
type ApplicationEventType = Database["public"]["Enums"]["application_event_type"];

const applicationStatusLabel: Record<ApplicationStatus, string> = {
  active: "Активна",
  hired: "Найнято",
  rejected: "Відмова",
  withdrawn: "Відкликано",
  on_hold: "На паузі",
};

const applicationStatusColor: Record<ApplicationStatus, string> = {
  active: "bg-green-100 text-green-800",
  hired: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-600",
  on_hold: "bg-yellow-100 text-yellow-800",
};

const eventTypeLabel: Record<ApplicationEventType, string> = {
  created: "Заявку створено",
  stage_changed: "Зміна стадії",
  note_added: "Нотатка",
  interview_scheduled: "Заплановано інтервʼю",
  interview_completed: "Інтервʼю завершено",
  offer_made: "Зроблено офер",
  offer_accepted: "Офер прийнято",
  offer_declined: "Офер відхилено",
  rejected: "Відмова",
  withdrawn: "Кандидат відкликав заявку",
  reactivated: "Відновлено",
  assessment_linked: "Привʼязано оцінку",
};

const CandidateDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidate, isLoading, isError, error } = useCandidate(id);
  const { data: applications, isLoading: applicationsLoading } = useApplicationsByCandidate(id);
  const { data: events, isLoading: eventsLoading } = useCandidateApplicationEvents(id);
  const logEvent = useLogApplicationEvent();

  const [noteApplicationId, setNoteApplicationId] = useState<string>("");
  const [noteText, setNoteText] = useState("");

  const handleSubmitNote = () => {
    if (!noteApplicationId || !noteText.trim()) return;
    logEvent.mutate(
      { applicationId: noteApplicationId, eventType: "note_added", note: noteText.trim() },
      {
        onSuccess: () => setNoteText(""),
      },
    );
  };

  if (isLoading) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8 text-center text-muted-foreground">Завантаження...</div>
      </AtsLayout>
    );
  }

  if (isError || !candidate) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8">
          <Button variant="ghost" onClick={() => navigate("/ats/candidates")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            До списку кандидатів
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Кандидата не знайдено або немає доступу"}
            </CardContent>
          </Card>
        </div>
      </AtsLayout>
    );
  }

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <Button variant="ghost" onClick={() => navigate("/ats/candidates")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          До списку кандидатів
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-semibold text-foreground">{candidate.full_name}</h1>
          {candidate.is_anonymized && <Badge variant="outline">знеособлено</Badge>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base">Профіль</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {candidate.headline && (
                <div>
                  <span className="text-muted-foreground">Посада: </span>
                  {candidate.headline}
                </div>
              )}
              {candidate.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {candidate.email}
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {candidate.phone}
                </div>
              )}
              {candidate.linkedin_url && (
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {candidate.linkedin_url}
                  </a>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {candidate.location}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Джерело: </span>
                {candidate.source?.name || "—"}
              </div>
              {candidate.notes && (
                <div>
                  <span className="text-muted-foreground">Нотатки: </span>
                  {candidate.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-medium flex items-center gap-2 mb-4">
                <Briefcase className="h-4 w-4" />
                Заявки
              </h2>
              {applicationsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
              ) : !applications || applications.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Ще немає заявок</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {applications.map((application) => {
                    const app = application as typeof application & {
                      vacancy: {
                        id: string;
                        title: string;
                        hiring_project: { id: string; name: string; client: { id: string; name: string } | null } | null;
                      } | null;
                      current_stage: { id: string; name: string } | null;
                    };
                    return (
                      <Card key={app.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                              {app.vacancy && (
                                <Link
                                  to={`/ats/vacancies/${app.vacancy.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {app.vacancy.title}
                                </Link>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {app.vacancy?.hiring_project?.client && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {app.vacancy.hiring_project.client.name}
                                  </span>
                                )}
                                {app.current_stage && <span>· Стадія: {app.current_stage.name}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={applicationStatusColor[app.status]}>
                                {applicationStatusLabel[app.status]}
                              </Badge>
                              <Button
                                size="sm"
                                variant={noteApplicationId === app.id ? "default" : "outline"}
                                onClick={() => setNoteApplicationId(app.id)}
                              >
                                Додати нотатку
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {noteApplicationId && (
                <Card className="mt-4">
                  <CardContent className="p-4 space-y-3">
                    <Textarea
                      placeholder="Текст нотатки (без сум/фінансових даних)..."
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNoteApplicationId("");
                          setNoteText("");
                        }}
                      >
                        Скасувати
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitNote}
                        disabled={!noteText.trim() || logEvent.isPending}
                      >
                        {logEvent.isPending ? "Збереження..." : "Зберегти нотатку"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h2 className="text-lg font-medium flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4" />
                Стрічка подій
              </h2>
              {eventsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
              ) : !events || events.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">Подій ще немає</CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <Card key={event.id}>
                      <CardContent className="p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{eventTypeLabel[event.event_type]}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString("uk-UA")}
                          </span>
                        </div>
                        {event.note && <p className="text-muted-foreground mt-1">{event.note}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AtsLayout>
  );
};

export default CandidateDetailPage;
