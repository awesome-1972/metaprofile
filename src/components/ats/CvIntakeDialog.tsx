import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { extractTextFromFile, ResumeParseError } from "@/lib/resume-parse-client";
import { useParseCvPreview, useSaveCvCandidate, type ParsedCv, type CvMatch } from "@/hooks/ats/use-cv-intake";

export type CvIntakeSource =
  | { kind: "drive"; driveFileId: string; fileName: string }
  | { kind: "upload"; file: File };

interface CvIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId: string;
  source: CvIntakeSource | null;
}

export function CvIntakeDialog({ open, onOpenChange, vacancyId, source }: CvIntakeDialogProps) {
  const parseCv = useParseCvPreview();
  const saveCandidate = useSaveCvCandidate();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<"parsing" | "review">("parsing");
  const [parsed, setParsed] = useState<ParsedCv | null>(null);
  const [matches, setMatches] = useState<CvMatch[]>([]);
  const [target, setTarget] = useState<string>("new"); // "new" | candidateId
  const [addToFunnel, setAddToFunnel] = useState(true);
  const [saving, setSaving] = useState(false);

  // Редаговані поля.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Уникаємо повторного парсингу того самого джерела.
  const parsedForRef = useRef<CvIntakeSource | null>(null);

  useEffect(() => {
    if (!open || !source) return;
    if (parsedForRef.current === source) return;
    parsedForRef.current = source;
    setPhase("parsing");
    setParsed(null);
    setMatches([]);
    setTarget("new");

    const run = async () => {
      try {
        let payload: { vacancy_id: string; resume_text?: string; drive_file_id?: string; file_name?: string };
        if (source.kind === "upload") {
          const text = await extractTextFromFile(source.file);
          payload = { vacancy_id: vacancyId, resume_text: text, file_name: source.file.name };
        } else {
          payload = { vacancy_id: vacancyId, drive_file_id: source.driveFileId, file_name: source.fileName };
        }
        const res = await parseCv.mutateAsync(payload);
        setParsed(res.parsed);
        setMatches(res.matches);
        setFullName(res.parsed.full_name ?? "");
        setEmail(res.parsed.email ?? "");
        setPhone(res.parsed.phone ?? "");
        setTarget(res.matches.length > 0 ? res.matches[0].id : "new");
        setPhase("review");
      } catch (err) {
        if (err instanceof ResumeParseError) toast.error(err.message);
        // інші помилки вже показані через onError хука
        onOpenChange(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  const resetAndClose = () => {
    parsedForRef.current = null;
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!parsed || !fullName.trim()) {
      toast.error("Вкажіть імʼя кандидата");
      return;
    }
    setSaving(true);
    try {
      const res = await saveCandidate.mutateAsync({
        vacancy_id: vacancyId,
        mode: target === "new" ? "create" : "update",
        candidate_id: target === "new" ? undefined : target,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        messengers: parsed.messengers ?? {},
        resume_parsed: parsed as unknown as Record<string, unknown>,
        add_to_funnel: addToFunnel,
      });
      // Оновити списки кандидатів і воронку вакансії.
      qc.invalidateQueries({ queryKey: ["ats", "candidates"] });
      qc.invalidateQueries({ queryKey: ["ats", "applications", "vacancy", vacancyId] });
      toast.success(
        (target === "new" ? "Кандидата створено" : "Кандидата оновлено") +
          (res.added_to_funnel ? " і додано у воронку" : ""),
      );
      resetAndClose();
    } catch {
      // помилка показана через onError хука
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Розпізнати CV</DialogTitle>
          <DialogDescription>
            AI розкладає резюме по полях. Перевірте й підтвердьте перед збереженням.
          </DialogDescription>
        </DialogHeader>

        {phase === "parsing" ? (
          <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Розпізнаю резюме...</p>
          </div>
        ) : parsed ? (
          <div className="space-y-4">
            {matches.length > 0 && (
              <Alert className="border-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-sm space-y-2">
                  <span className="font-medium">Схоже на наявного кандидата.</span> Оберіть, що робити:
                  <div className="space-y-1.5 mt-2">
                    {matches.map((m) => (
                      <label key={m.id} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          className="mt-1"
                          name="cv-target"
                          checked={target === m.id}
                          onChange={() => setTarget(m.id)}
                        />
                        <span>
                          Оновити: <span className="font-medium">{m.full_name ?? "Без імені"}</span>
                          {m.email ? ` · ${m.email}` : ""}
                          {m.phone ? ` · ${m.phone}` : ""}
                        </span>
                      </label>
                    ))}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        className="mt-1"
                        name="cv-target"
                        checked={target === "new"}
                        onChange={() => setTarget("new")}
                      />
                      <span>Створити нового кандидата</span>
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cv-name">Імʼя *</Label>
              <Input id="cv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cv-email">Email</Label>
                <Input id="cv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cv-phone">Телефон</Label>
                <Input id="cv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            {parsed.location && (
              <p className="text-sm text-muted-foreground">📍 {parsed.location}</p>
            )}

            {/* Короткий підсумок розпізнаного — read-only для перевірки. */}
            {parsed.positions.length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-1">Досвід ({parsed.positions.length})</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {parsed.positions.slice(0, 4).map((p, i) => (
                    <li key={i} className="truncate">
                      {[p.title, p.company].filter(Boolean).join(" — ")}
                      {p.from || p.to ? ` (${[p.from, p.to].filter(Boolean).join(" – ")})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.skills.length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-1">Навички</p>
                <div className="flex flex-wrap gap-1">
                  {parsed.skills.slice(0, 20).map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer pt-2 border-t">
              <Checkbox checked={addToFunnel} onCheckedChange={(v) => setAddToFunnel(v === true)} />
              Додати кандидата у воронку цієї вакансії
            </label>
          </div>
        ) : null}

        {phase === "review" && parsed && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Скасувати
            </Button>
            <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
              <UserPlus className="h-4 w-4 mr-2" />
              {saving
                ? "Збереження..."
                : target === "new"
                  ? "Створити кандидата"
                  : "Оновити кандидата"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
