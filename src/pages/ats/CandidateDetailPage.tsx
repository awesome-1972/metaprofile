import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Mail,
  Phone,
  Linkedin,
  Facebook,
  Send,
  MessageCircle,
  MapPin,
  Users,
  Clock,
  FileText,
  Upload,
  ChevronDown,
  MessagesSquare,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCandidate,
  useUpdateCandidateMessengers,
  useParseResume,
  type CandidateMessengers,
} from "@/hooks/ats/use-candidates";
import {
  useApplicationsByCandidate,
  useCandidateApplicationEvents,
  useLogApplicationEvent,
} from "@/hooks/ats/use-applications";
import {
  useCommunicationsByCandidate,
  useSaveDraftCommunication,
  useSendCommunicationNow,
  type CommStatus,
} from "@/hooks/ats/use-communications";
import { extractTextFromFile, ResumeParseError } from "@/lib/resume-parse-client";
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
  list_state_changed: "Зміна списку (long/short)",
};

const commStatusLabel: Record<CommStatus, string> = {
  draft: "Чернетка",
  queued: "У черзі",
  sent: "Надіслано",
  failed: "Помилка",
  cancelled: "Скасовано",
};

// badge.tsx має лише default/secondary/destructive/outline варіанти —
// колір статусу задаємо через className override, не через новий variant.
const commStatusClassName: Record<CommStatus, string> = {
  draft: "",
  queued: "bg-blue-100 text-blue-800 border-transparent",
  sent: "bg-green-100 text-green-800 border-transparent",
  failed: "",
  cancelled: "",
};

const commStatusVariant: Record<CommStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  queued: "default",
  sent: "default",
  failed: "destructive",
  cancelled: "outline",
};

function messengerLink(key: keyof CandidateMessengers, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  switch (key) {
    case "telegram":
      return `https://t.me/${trimmed.replace(/^@/, "")}`;
    case "whatsapp":
      return `https://wa.me/${trimmed.replace(/\D/g, "")}`;
    case "viber":
      return `viber://chat?number=${trimmed.replace(/\D/g, "")}`;
    case "linkedin":
    case "facebook":
      return trimmed;
    default:
      return null;
  }
}

const messengerMeta: { key: keyof CandidateMessengers; label: string; icon: typeof Send }[] = [
  { key: "telegram", label: "Telegram", icon: Send },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "viber", label: "Viber", icon: MessageCircle },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "facebook", label: "Facebook", icon: Facebook },
];

function renderResumeParsedSection(title: string, value: unknown) {
  if (!value) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div key={title}>
        <div className="text-sm font-medium mb-1">{title}</div>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
          {value.map((item, idx) => (
            <li key={idx}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (typeof value === "string") {
    if (!value.trim()) return null;
    return (
      <div key={title}>
        <div className="text-sm font-medium mb-1">{title}</div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
      </div>
    );
  }
  return (
    <div key={title}>
      <div className="text-sm font-medium mb-1">{title}</div>
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

const CandidateDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidate, isLoading, isError, error } = useCandidate(id);
  const { data: applications, isLoading: applicationsLoading } = useApplicationsByCandidate(id);
  const { data: events, isLoading: eventsLoading } = useCandidateApplicationEvents(id);
  const logEvent = useLogApplicationEvent();
  const { data: communications, isLoading: communicationsLoading } = useCommunicationsByCandidate(id);
  const updateMessengers = useUpdateCandidateMessengers();
  const parseResume = useParseResume();
  const saveDraft = useSaveDraftCommunication();
  const sendNow = useSendCommunicationNow();

  const [noteApplicationId, setNoteApplicationId] = useState<string>("");
  const [noteText, setNoteText] = useState("");

  const [messengerEditOpen, setMessengerEditOpen] = useState(false);
  const [messengerDraft, setMessengerDraft] = useState<CandidateMessengers>({});

  const [resumeUploading, setResumeUploading] = useState(false);
  const [manualResumeText, setManualResumeText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const handleSubmitNote = () => {
    if (!noteApplicationId || !noteText.trim()) return;
    logEvent.mutate(
      { applicationId: noteApplicationId, eventType: "note_added", note: noteText.trim() },
      {
        onSuccess: () => setNoteText(""),
      },
    );
  };

  const openMessengerEdit = () => {
    setMessengerDraft(candidate?.messengers ?? {});
    setMessengerEditOpen(true);
  };

  const handleSaveMessengers = () => {
    if (!id) return;
    updateMessengers.mutate(
      { id, messengers: messengerDraft },
      { onSuccess: () => setMessengerEditOpen(false) },
    );
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) return;
    setResumeUploading(true);
    try {
      const text = await extractTextFromFile(file);
      parseResume.mutate({ candidate_id: id, resume_text: text, file_name: file.name });
    } catch (err) {
      if (err instanceof ResumeParseError) {
        toast.error(err.message);
      } else {
        toast.error("Не вдалося прочитати файл резюме");
      }
    } finally {
      setResumeUploading(false);
    }
  };

  const handleManualResumeSubmit = () => {
    if (!id || !manualResumeText.trim()) return;
    parseResume.mutate(
      { candidate_id: id, resume_text: manualResumeText.trim() },
      { onSuccess: () => setManualResumeText("") },
    );
  };

  const openCompose = () => {
    setComposeSubject("");
    setComposeBody("");
    setComposeOpen(true);
  };

  const handleSendNow = () => {
    if (!id || !composeBody.trim()) return;
    sendNow.mutate(
      { candidate_id: id, subject: composeSubject.trim() || undefined, body: composeBody.trim() },
      { onSuccess: () => setComposeOpen(false) },
    );
  };

  const handleSaveDraftCommunication = () => {
    if (!id || !composeBody.trim()) return;
    saveDraft.mutate(
      { candidate_id: id, subject: composeSubject.trim() || undefined, body: composeBody.trim() },
      { onSuccess: () => setComposeOpen(false) },
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

  const messengers = candidate.messengers ?? {};
  const activeMessengers = messengerMeta
    .map((m) => ({ ...m, value: messengers[m.key], href: messengers[m.key] ? messengerLink(m.key, messengers[m.key]!) : null }))
    .filter((m) => m.href);

  const resumeParsed = (candidate.resume_parsed ?? null) as
    | { досвід?: unknown; experience?: unknown; освіта?: unknown; education?: unknown; навички?: unknown; skills?: unknown; мови?: unknown; languages?: unknown }
    | null;

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
          <div className="lg:col-span-1 space-y-6">
            <Card className="h-fit">
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

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Месенджери</span>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={openMessengerEdit}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {activeMessengers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Не вказано</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeMessengers.map((m) => (
                        <Button key={m.key} asChild size="sm" variant="outline" className="h-7 text-xs">
                          <a href={m.href!} target="_blank" rel="noreferrer">
                            <m.icon className="h-3.5 w-3.5 mr-1.5" />
                            {m.label}
                          </a>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Резюме
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={resumeUploading || parseResume.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {resumeUploading || parseResume.isPending ? "Обробка..." : "Завантажити файл (.pdf, .docx)"}
                  </Button>
                </div>

                {candidate.resume_file_name && (
                  <p className="text-xs text-muted-foreground">Файл: {candidate.resume_file_name}</p>
                )}

                {resumeParsed && (
                  <div className="space-y-3 rounded-md border border-border p-3 bg-muted/20">
                    {renderResumeParsedSection("Досвід", resumeParsed.досвід ?? resumeParsed.experience)}
                    {renderResumeParsedSection("Освіта", resumeParsed.освіта ?? resumeParsed.education)}
                    {renderResumeParsedSection("Навички", resumeParsed.навички ?? resumeParsed.skills)}
                    {renderResumeParsedSection("Мови", resumeParsed.мови ?? resumeParsed.languages)}
                  </div>
                )}

                {candidate.resume_text && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button size="sm" variant="ghost" className="w-full justify-between px-2">
                        Витягнутий текст резюме
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
                        {candidate.resume_text}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="pt-2 border-t border-border space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Вставити текст резюме вручну
                  </Label>
                  <Textarea
                    value={manualResumeText}
                    onChange={(e) => setManualResumeText(e.target.value)}
                    placeholder="Вставте текст резюме..."
                    rows={4}
                  />
                  <Button
                    size="sm"
                    onClick={handleManualResumeSubmit}
                    disabled={!manualResumeText.trim() || parseResume.isPending}
                  >
                    {parseResume.isPending ? "Обробка..." : "Розібрати текст"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="applications">
              <TabsList>
                <TabsTrigger value="applications">Заявки</TabsTrigger>
                <TabsTrigger value="timeline">Стрічка подій</TabsTrigger>
                <TabsTrigger value="communications">Комунікації</TabsTrigger>
              </TabsList>

              <TabsContent value="applications" className="pt-4 space-y-6">
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
              </TabsContent>

              <TabsContent value="timeline" className="pt-4">
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
              </TabsContent>

              <TabsContent value="communications" className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <MessagesSquare className="h-4 w-4" />
                    Комунікації
                  </h2>
                  <Button size="sm" onClick={openCompose}>
                    Написати листа
                  </Button>
                </div>
                {communicationsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
                ) : !communications || communications.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <MessagesSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Комунікацій ще немає</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {communications.map((comm) => (
                      <Card key={comm.id}>
                        <CardContent className="p-3 text-sm">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{comm.subject || "(без теми)"}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {comm.channel} · {new Date(comm.created_at).toLocaleString("uk-UA")}
                                {comm.sent_at ? ` · надіслано ${new Date(comm.sent_at).toLocaleString("uk-UA")}` : ""}
                              </div>
                            </div>
                            <Badge
                              variant={commStatusVariant[comm.status]}
                              className={commStatusClassName[comm.status]}
                            >
                              {commStatusLabel[comm.status]}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Діалог редагування месенджерів */}
      <Dialog open={messengerEditOpen} onOpenChange={setMessengerEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Контакти в месенджерах</DialogTitle>
            <DialogDescription>Username/номер/URL — довільний формат за каналом</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {messengerMeta.map((m) => (
              <div key={m.key} className="space-y-1.5">
                <Label htmlFor={`messenger-${m.key}`}>{m.label}</Label>
                <Input
                  id={`messenger-${m.key}`}
                  value={messengerDraft[m.key] ?? ""}
                  onChange={(e) => setMessengerDraft((prev) => ({ ...prev, [m.key]: e.target.value }))}
                  placeholder={
                    m.key === "telegram"
                      ? "@username"
                      : m.key === "whatsapp" || m.key === "viber"
                        ? "+380..."
                        : "https://..."
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMessengerEditOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSaveMessengers} disabled={updateMessengers.isPending}>
              {updateMessengers.isPending ? "Збереження..." : "Зберегти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Діалог "Написати листа" */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Написати листа</DialogTitle>
            <DialogDescription>
              У тексті можна використати <code>{"{{name}}"}</code> — буде замінено на імʼя кандидата
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Тема</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Текст листа</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Привіт, {{name}}!..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraftCommunication}
              disabled={!composeBody.trim() || saveDraft.isPending}
            >
              {saveDraft.isPending ? "Збереження..." : "Зберегти чернетку"}
            </Button>
            <Button onClick={handleSendNow} disabled={!composeBody.trim() || sendNow.isPending}>
              {sendNow.isPending ? "Відправка..." : "Відправити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AtsLayout>
  );
};

export default CandidateDetailPage;
