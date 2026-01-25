import { FileText, Clock, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface CaseCardProps {
  title: string;
  description: string;
  company?: string;
  duration?: string;
  participants?: number;
  competencies?: string[];
  status?: "open" | "in_progress" | "completed" | "draft";
  link?: string;
  className?: string;
}

const statusLabels = {
  open: "Відкритий",
  in_progress: "В процесі",
  completed: "Завершено",
  draft: "Чернетка",
};

const statusStyles = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-chart-2/20 text-chart-5",
  completed: "bg-muted text-muted-foreground",
  draft: "bg-accent text-accent-foreground",
};

export const CaseCard = ({
  title,
  description,
  company,
  duration,
  participants,
  competencies,
  status = "open",
  link,
  className,
}: CaseCardProps) => {
  const content = (
    <div className={cn(
      "rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm",
      link && "cursor-pointer",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{title}</h4>
            {company && (
              <p className="text-sm text-muted-foreground">{company}</p>
            )}
          </div>
        </div>
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusStyles[status])}>
          {statusLabels[status]}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {description}
      </p>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        {duration && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        )}
        {participants !== undefined && (
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{participants} учасників</span>
          </div>
        )}
      </div>

      {competencies && competencies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {competencies.map((comp, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs"
            >
              {comp}
            </span>
          ))}
        </div>
      )}

      {link && (
        <div className="flex items-center justify-end mt-4 text-primary text-sm">
          <span>Детальніше</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
};
