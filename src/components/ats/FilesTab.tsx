import { useMemo, useRef, useState, type ChangeEvent } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ExternalLink, FileText, Folder, FolderInput, FolderSymlink, Plus, ScanText, Trash2, Upload } from "lucide-react";
import { usePermissions } from "@/hooks/ats/use-permissions";
import { CvIntakeDialog, type CvIntakeSource } from "@/components/ats/CvIntakeDialog";
import {
  FILE_CATEGORIES,
  parseDriveFileId,
  useAddVacancyFile,
  useDeleteVacancyFile,
  useDeleteVacancyFiles,
  useMoveVacancyFiles,
  useImportDriveFolder,
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
  const deleteFiles = useDeleteVacancyFiles();
  const moveFiles = useMoveVacancyFiles();
  const importFolder = useImportDriveFolder();
  const { can } = usePermissions();
  const canEdit = can("files.manage");

  // Вибір файлів для масових операцій (видалення / переміщення).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>(FILE_CATEGORIES[0].key);

  // Розпізнавання CV (крок 2): джерело — Drive-файл або завантаження.
  const [cvSource, setCvSource] = useState<CvIntakeSource | null>(null);
  const [cvDialogOpen, setCvDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCvFromDrive = (driveFileId: string, fileName: string) => {
    setCvSource({ kind: "drive", driveFileId, fileName });
    setCvDialogOpen(true);
  };
  const handleUploadCv = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // дозволити повторний вибір того самого файлу
    if (!file) return;
    setCvSource({ kind: "upload", file });
    setCvDialogOpen(true);
  };

  const allIds = useMemo(() => (files ?? []).map((f) => f.id), [files]);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0;

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allIds) : new Set());
  };
  const toggleMany = (ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = () => {
    deleteFiles.mutate(
      { ids: Array.from(selected), vacancyId },
      {
        onSuccess: () => {
          setConfirmBulkOpen(false);
          clearSelection();
        },
      },
    );
  };

  const handleBulkMove = () => {
    moveFiles.mutate(
      { ids: Array.from(selected), category: moveTarget, vacancyId },
      {
        onSuccess: () => {
          setMoveDialogOpen(false);
          clearSelection();
        },
      },
    );
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState<string>(FILE_CATEGORIES[0].key);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderLink, setFolderLink] = useState("");

  const handleImportFolder = () => {
    if (!folderLink.trim()) return;
    importFolder.mutate(
      { vacancy_id: vacancyId, folder_url_or_id: folderLink.trim() },
      {
        onSuccess: () => {
          setFolderDialogOpen(false);
          setFolderLink("");
        },
      },
    );
  };

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
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleUploadCv}
            />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Розпізнати CV
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFolderDialogOpen(true)}>
              <FolderInput className="h-4 w-4 mr-2" />
              Прив'язати папку Drive
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Додати файл
            </Button>
          </div>
        )}
      </div>

      {canEdit && allIds.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-md border bg-muted/30 px-3 py-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(v) => toggleAll(v === true)}
            />
            Обрати всі
          </label>
          {someSelected && (
            <>
              <span className="text-sm text-muted-foreground">Обрано: {selected.size}</span>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Зняти вибір
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMoveDialogOpen(true)}
                  disabled={moveFiles.isPending}
                >
                  <FolderSymlink className="h-4 w-4 mr-2" />
                  Перемістити ({selected.size})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmBulkOpen(true)}
                  disabled={deleteFiles.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Видалити ({selected.size})
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
      ) : (
        <div className="space-y-4">
          {FILE_CATEGORIES.map((cat) => {
            const list = byCategory[cat.key] ?? [];
            const catIds = list.map((f) => f.id);
            const allCatSelected = catIds.length > 0 && catIds.every((id) => selected.has(id));
            const someCatSelected = catIds.some((id) => selected.has(id));
            return (
              <Card key={cat.key}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {canEdit && list.length > 0 && (
                      <Checkbox
                        checked={allCatSelected ? true : someCatSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleMany(catIds, v === true)}
                        title="Обрати все в цій папці"
                      />
                    )}
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
                          className="flex items-center gap-2 pl-2 text-sm group"
                        >
                          {canEdit && (
                            <Checkbox
                              className="flex-shrink-0"
                              checked={selected.has(f.id)}
                              onCheckedChange={(v) => toggleOne(f.id, v === true)}
                            />
                          )}
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
                          {canEdit && f.drive_file_id && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Розпізнати CV у поля кандидата"
                              onClick={() => openCvFromDrive(f.drive_file_id!, f.name)}
                            >
                              <ScanText className="h-3.5 w-3.5" />
                            </button>
                          )}
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

      <Dialog
        open={folderDialogOpen}
        onOpenChange={(open) => {
          setFolderDialogOpen(open);
          if (!open) setFolderLink("");
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Прив'язати папку Google Drive</DialogTitle>
            <DialogDescription>
              Вставте корінь папки вакансії. Обхід рекурсивний: усі підпапки провалюються
              вглиб, а файли самі розкладаються по категоріях за назвою підпапки (Long List,
              CVs, Reports…); нерозпізнане — у «Інше». Дублі за файлом Drive пропускаються.
              Папка має бути доступна вам у Workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="vf-folder-link">Лінк на папку Drive</Label>
              <Input
                id="vf-folder-link"
                value={folderLink}
                onChange={(e) => setFolderLink(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleImportFolder} disabled={!folderLink.trim() || importFolder.isPending}>
              {importFolder.isPending ? "Імпорт..." : "Імпортувати файли"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Перемістити в папку</DialogTitle>
            <DialogDescription>
              Обрано файлів: {selected.size}. Оберіть категорію-папку, куди перемістити.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Папка</Label>
            <Select value={moveTarget} onValueChange={setMoveTarget}>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleBulkMove} disabled={moveFiles.isPending}>
              {moveFiles.isPending ? "Переміщення..." : "Перемістити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Видалити обрані файли?</DialogTitle>
            <DialogDescription>
              Буде видалено записів: {selected.size}. Це прибирає лінки з вакансії — самі
              файли в Google Drive лишаються.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmBulkOpen(false)}>
              Скасувати
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={deleteFiles.isPending}>
              {deleteFiles.isPending ? "Видалення..." : `Видалити (${selected.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CvIntakeDialog
        open={cvDialogOpen}
        onOpenChange={(o) => {
          setCvDialogOpen(o);
          if (!o) setCvSource(null);
        }}
        vacancyId={vacancyId}
        source={cvSource}
      />
    </div>
  );
}
