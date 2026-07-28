import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ExternalLink, FileText, Folder, Plus, Trash2 } from "lucide-react";
import { usePermissions } from "@/hooks/ats/use-permissions";
import {
  FILE_CATEGORIES,
  parseDriveFileId,
  useAddVacancyFile,
  useDeleteVacancyFile,
  useVacancyFiles,
  type VacancyFile,
} from "@/hooks/ats/use-vacancy-files";

interface FilesTabProps {
  vacancyId: string;
}

export function FilesTab({ vacancyId }: FilesTabProps) {
  const { data: files, isLoading } = useVacancyFiles(vacancyId);
  const addFile = useAddVacancyFile();
  const deleteFile = useDeleteVacancyFile();
  const { can } = usePermissions();
  const canEdit = can("files.manage");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState<string>(FILE_CATEGORIES[0].key);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");

  // Файли за категорією-папкою.
  const byCategory = useMemo(() => {
    const map: Record<string, VacancyFile[]> = {};
    for (const f of files ?? []) (map[f.category] ??= []).push(f);
    return map;
  }, [files]);

  const driveId = parseDriveFileId(link);
  // Дедуп-попередження: той самий файл Drive або збіг імені в цій категорії.
  const duplicate = useMemo(() => {
    const list = files ?? [];
    if (driveId && list.some((f) => f.drive_file_id === driveId)) return "drive";
    if (name.trim() && list.some((f) => f.category === category && f.name.trim().toLowerCase() === name.trim().toLowerCase()))
      return "name";
    return null;
  }, [files, driveId, name, category]);

  const resetForm = () => {
    setCategory(FILE_CATEGORIES[0].key);
    setName("");
    setLink("");
    setNote("");
  };

  const handleAdd = () => {
    if (!name.trim() || duplicate === "drive") return;
    addFile.mutate(
      {
        vacancy_id: vacancyId,
        category,
        name,
        web_view_link: link || null,
        drive_file_id: driveId,
        note: note || null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Файли вакансії за папками. Drive — сховище, тут — метадані й лінки.
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Додати файл
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
      ) : (
        <div className="space-y-4">
          {FILE_CATEGORIES.map((cat) => {
            const list = byCategory[cat.key] ?? [];
            return (
              <Card key={cat.key}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">{cat.label}</h3>
                    <Badge variant="outline" className="text-xs">
                      {list.length}
                    </Badge>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-6">Порожньо</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {list.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center gap-2 pl-6 text-sm group"
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          {f.web_view_link ? (
                            <a
                              href={f.web_view_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 truncate"
                            >
                              {f.name}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="truncate">{f.name}</span>
                          )}
                          {f.note && (
                            <span className="text-xs text-muted-foreground truncate">— {f.note}</span>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(f.created_at).toLocaleDateString("uk-UA")}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Видалити"
                              disabled={deleteFile.isPending}
                              onClick={() => deleteFile.mutate({ id: f.id, vacancyId })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Додати файл</DialogTitle>
            <DialogDescription>
              Вставте лінк на файл у Google Drive і оберіть папку
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Папка</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vf-name">Назва файлу *</Label>
              <Input
                id="vf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Резюме_Іваненко.pdf"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vf-link">Лінк на Google Drive</Label>
              <Input
                id="vf-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vf-note">Примітка</Label>
              <Textarea id="vf-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {duplicate === "drive" && (
              <Alert className="border-red-300">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-sm">
                  Цей файл Drive уже додано до вакансії — повторно зареєструвати не можна.
                </AlertDescription>
              </Alert>
            )}
            {duplicate === "name" && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  У цій папці вже є файл з такою назвою. Перевірте, чи це не дубль.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleAdd} disabled={!name.trim() || duplicate === "drive" || addFile.isPending}>
              {addFile.isPending ? "Додавання..." : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
