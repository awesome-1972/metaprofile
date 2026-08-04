import { useState } from "react";
import { X, Tag as TagIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUpdateCandidate } from "@/hooks/ats/use-candidates";

interface CandidateTagsEditorProps {
  candidateId: string;
  tags: string[];
  canEdit?: boolean;
}

/** Теги кандидата для Talent CRM — додавання/видалення міток (пул кандидатів). */
export function CandidateTagsEditor({ candidateId, tags, canEdit = true }: CandidateTagsEditorProps) {
  const updateCandidate = useUpdateCandidate();
  const [draft, setDraft] = useState("");

  const save = (next: string[]) =>
    updateCandidate.mutate({ id: candidateId, patch: { tags: next } as unknown as Parameters<typeof updateCandidate.mutate>[0]["patch"] });

  const addTag = () => {
    const t = draft.trim();
    if (!t || tags.includes(t)) { setDraft(""); return; }
    save([...tags, t]);
    setDraft("");
  };
  const removeTag = (t: string) => save(tags.filter((x) => x !== t));

  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        <TagIcon className="h-3.5 w-3.5" />
        <span>Теги</span>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.length === 0 && !canEdit && <span className="text-xs text-muted-foreground">—</span>}
        {tags.map((t) => (
          <Badge key={t} className="bg-purple-100 text-purple-800 font-normal gap-1">
            {t}
            {canEdit && (
              <button type="button" onClick={() => removeTag(t)} className="hover:text-purple-950" title="Прибрати">
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {canEdit && (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            onBlur={addTag}
            placeholder="+ тег"
            className="h-6 w-24 text-xs px-2"
            disabled={updateCandidate.isPending}
          />
        )}
      </div>
    </div>
  );
}
