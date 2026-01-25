import { User, MoreHorizontal, Eye, MessageSquare, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CompetencyScore {
  name: string;
  score: number;
}

interface CandidateCardProps {
  name: string;
  position?: string;
  caseCompleted?: string;
  completionDate?: string;
  overallScore?: number;
  competencies?: CompetencyScore[];
  status?: "new" | "reviewed" | "shortlisted" | "rejected";
  onView?: () => void;
  onInvite?: () => void;
  onReject?: () => void;
  className?: string;
}

const statusLabels = {
  new: "Новий",
  reviewed: "Переглянуто",
  shortlisted: "У шорт-лісті",
  rejected: "Відхилено",
};

const statusStyles = {
  new: "bg-primary/10 text-primary",
  reviewed: "bg-muted text-muted-foreground",
  shortlisted: "bg-primary/20 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

export const CandidateCard = ({
  name,
  position,
  caseCompleted,
  completionDate,
  overallScore,
  competencies,
  status = "new",
  onView,
  onInvite,
  onReject,
  className,
}: CandidateCardProps) => {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <User className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{name}</h4>
            {position && (
              <p className="text-sm text-muted-foreground">{position}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusStyles[status])}>
            {statusLabels[status]}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                Переглянути профіль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onInvite}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Запросити на співбесіду
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReject} className="text-destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Відхилити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {caseCompleted && (
        <div className="mb-4 p-3 rounded-md bg-accent/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Виконаний кейс
          </p>
          <p className="text-sm font-medium text-foreground">{caseCompleted}</p>
          {completionDate && (
            <p className="text-xs text-muted-foreground mt-1">{completionDate}</p>
          )}
        </div>
      )}

      {overallScore !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Загальний результат</span>
            <span className="text-lg font-semibold text-foreground">{overallScore}%</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      )}

      {competencies && competencies.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Компетенції
          </p>
          {competencies.map((comp, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{comp.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{comp.score}%</span>
                <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${comp.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
