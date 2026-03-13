import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, FileText, Building2, Globe, Mail, Phone, Trash2, Send } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useCompanyCases, type CaseTask } from "@/hooks/useCases";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Status helpers ─────────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  draft: "Чернетка",
  active: "Активний",
  archived: "Архів",
};
const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  archived: "bg-red-100 text-red-700",
};

// ── Component ──────────────────────────────────────────────────────────────────
const CompanyDashboard = () => {
  const { profile, user } = useAuthV2();

  // Company profile state
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState({
    name: "", description: "", industry: "", website: "", logo_url: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Cases
  const { cases, isLoading: casesLoading, createCase, publishCase, archiveCase, assignCase } =
    useCompanyCases(companyId);

  // Create-case dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [caseForm, setCaseForm] = useState({
    title: "", description: "", context: "", position_title: "",
    difficulty: "middle", duration_minutes: 60,
  });
  const [tasks, setTasks] = useState<CaseTask[]>([
    { id: crypto.randomUUID(), title: "", description: "" },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCaseId, setAssignCaseId] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignMessage, setAssignMessage] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch company on mount
  useEffect(() => {
    if (user?.id) fetchCompany();
  }, [user?.id]);

  const fetchCompany = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (data) {
      setCompanyId(data.id);
      setCompanyData({
        name: data.name || "",
        description: data.description || "",
        industry: data.industry || "",
        website: data.website || "",
        logo_url: data.logo_url || "",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("companies").select("id").eq("owner_id", user.id).maybeSingle();
      if (existing) {
        await supabase.from("companies")
          .update({ ...companyData }).eq("id", existing.id);
        setCompanyId(existing.id);
      } else {
        const { data: inserted } = await supabase.from("companies")
          .insert({ ...companyData, owner_id: user.id }).select("id").single();
        if (inserted) setCompanyId(inserted.id);
      }
      toast.success("Профіль компанії збережено");
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Case creation ────────────────────────────────────────────────────────────
  const handleCreateCase = async () => {
    if (!caseForm.title.trim() || !caseForm.description.trim()) {
      toast.error("Заповніть назву та опис кейсу");
      return;
    }
    const validTasks = tasks.filter((t) => t.title.trim());
    if (validTasks.length === 0) {
      toast.error("Додайте хоча б одне завдання");
      return;
    }
    setIsCreating(true);
    await createCase({
      ...caseForm,
      tasks: validTasks,
      userId: user!.id,
    });
    setIsCreating(false);
    setCreateOpen(false);
    setCaseForm({ title: "", description: "", context: "", position_title: "", difficulty: "middle", duration_minutes: 60 });
    setTasks([{ id: crypto.randomUUID(), title: "", description: "" }]);
  };

  const addTask = () =>
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), title: "", description: "" }]);

  const removeTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const updateTask = (id: string, field: "title" | "description", value: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  // ── Assignment ───────────────────────────────────────────────────────────────
  const openAssignDialog = (caseId: string) => {
    setAssignCaseId(caseId);
    setAssignEmail("");
    setAssignMessage("");
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!assignCaseId || !assignEmail.trim()) {
      toast.error("Введіть email кандидата");
      return;
    }
    setIsAssigning(true);
    await assignCase(assignCaseId, assignEmail.trim(), user!.id, assignMessage || undefined);
    setIsAssigning(false);
    setAssignOpen(false);
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const activeCases = cases.filter((c) => c.status === "active").length;
  const draftCases = cases.filter((c) => c.status === "draft").length;

  return (
    <V2AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Вітаємо, {profile?.full_name || "Компанія"}!
            </h1>
            <p className="text-muted-foreground mt-1">Панель управління наймом</p>
          </div>
        </div>

        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList>
            <TabsTrigger value="cases">Кейси</TabsTrigger>
            <TabsTrigger value="profile">Профіль компанії</TabsTrigger>
          </TabsList>

          {/* ── CASES TAB ───────────────────────────────────────────────────── */}
          <TabsContent value="cases">
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Всього кейсів</CardDescription>
                  <CardTitle className="text-3xl">{cases.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Активних</CardDescription>
                  <CardTitle className="text-3xl">{activeCases}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Чернеток</CardDescription>
                  <CardTitle className="text-3xl">{draftCases}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Cases list header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Ваші кейси</h2>
              <Button onClick={() => setCreateOpen(true)} disabled={!companyId}>
                <Plus className="h-4 w-4 mr-2" />
                Створити кейс
              </Button>
            </div>

            {!companyId && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 mb-4">
                Спочатку збережіть профіль компанії на вкладці "Профіль компанії"
              </div>
            )}

            {casesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
            ) : cases.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Ще немає кейсів</p>
                  <p className="text-sm mt-1">Створіть перший кейс для оцінки кандидатів</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cases.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">{c.title}</span>
                            <Badge className={statusColor[c.status] || ""}>
                              {statusLabel[c.status] || c.status}
                            </Badge>
                            <Badge variant="outline">{c.difficulty}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.tasks.length} завдань · {c.duration_minutes} хв
                            {c.position_title ? ` · ${c.position_title}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => publishCase(c.id)}>
                              Опублікувати
                            </Button>
                          )}
                          <Button size="sm" onClick={() => openAssignDialog(c.id)}>
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Призначити
                          </Button>
                          {c.status === "active" && (
                            <Button size="sm" variant="ghost" onClick={() => archiveCase(c.id)}>
                              Архівувати
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── PROFILE TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Основна інформація
                    </CardTitle>
                    <CardDescription>Заповніть дані про вашу компанію</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Назва компанії</Label>
                      <Input id="company-name" value={companyData.name}
                        onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                        placeholder="Назва вашої компанії" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Індустрія</Label>
                      <Input id="industry" value={companyData.industry}
                        onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                        placeholder="IT, Фінанси, Освіта..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Опис компанії</Label>
                      <Textarea id="description" value={companyData.description}
                        onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                        placeholder="Розкажіть про вашу компанію..." rows={4} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Веб-сайт</Label>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <Input id="website" value={companyData.website}
                          onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                          placeholder="https://example.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logo">URL логотипу</Label>
                      <Input id="logo" value={companyData.logo_url}
                        onChange={(e) => setCompanyData({ ...companyData, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png" />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? "Збереження..." : "Зберегти профіль"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Контактна особа</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Не вказано</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.full_name || "Не вказано"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── CREATE CASE DIALOG ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новий кейс</DialogTitle>
            <DialogDescription>Створіть кейс для оцінки кандидатів</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Назва кейсу *</Label>
                <Input value={caseForm.title}
                  onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                  placeholder="Аналіз ринку для нового продукту" />
              </div>
              <div className="space-y-2">
                <Label>Посада</Label>
                <Input value={caseForm.position_title}
                  onChange={(e) => setCaseForm({ ...caseForm, position_title: e.target.value })}
                  placeholder="Product Manager" />
              </div>
              <div className="space-y-2">
                <Label>Рівень</Label>
                <Select value={caseForm.difficulty}
                  onValueChange={(v) => setCaseForm({ ...caseForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="middle">Middle</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Очікуваний час (хв)</Label>
                <Input type="number" value={caseForm.duration_minutes}
                  onChange={(e) => setCaseForm({ ...caseForm, duration_minutes: parseInt(e.target.value) || 60 })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Контекст (бізнес-ситуація)</Label>
              <Textarea value={caseForm.context}
                onChange={(e) => setCaseForm({ ...caseForm, context: e.target.value })}
                placeholder="Опишіть бізнес-контекст: компанія, ринок, виклик..." rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Опис завдання *</Label>
              <Textarea value={caseForm.description}
                onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                placeholder="Що має зробити кандидат?" rows={3} />
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Завдання</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTask}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Додати завдання
                </Button>
              </div>
              {tasks.map((task, index) => (
                <div key={task.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Завдання {index + 1}
                    </span>
                    {tasks.length > 1 && (
                      <button onClick={() => removeTask(task.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Input placeholder="Назва завдання"
                    value={task.title}
                    onChange={(e) => updateTask(task.id, "title", e.target.value)} />
                  <Textarea placeholder="Деталі завдання (необов'язково)"
                    value={task.description || ""}
                    onChange={(e) => updateTask(task.id, "description", e.target.value)}
                    rows={2} />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Скасувати</Button>
            <Button onClick={handleCreateCase} disabled={isCreating}>
              {isCreating ? "Створення..." : "Створити кейс"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ASSIGN DIALOG ──────────────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Призначити кейс кандидату</DialogTitle>
            <DialogDescription>
              Кандидат отримає кейс у своєму кабінеті. Він має бути зареєстрований як candidate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email кандидата *</Label>
              <Input value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                placeholder="candidate@example.com"
                type="email" />
            </div>
            <div className="space-y-2">
              <Label>Повідомлення (необов'язково)</Label>
              <Textarea value={assignMessage}
                onChange={(e) => setAssignMessage(e.target.value)}
                placeholder="Привіт! Ми запрошуємо вас пройти оцінку..."
                rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Скасувати</Button>
            <Button onClick={handleAssign} disabled={isAssigning}>
              {isAssigning ? "Призначення..." : "Призначити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </V2AppLayout>
  );
};

export default CompanyDashboard;
