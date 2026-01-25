import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInsightCardProps {
  title: string;
  insight: string;
  factors?: { label: string; value: string; weight: number }[];
  methodology?: string;
  className?: string;
}

export const AIInsightCard = ({
  title,
  insight,
  factors,
  methodology,
  className,
}: AIInsightCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      {/* Header with AI badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          <span>Аналітика з AI-підтримкою</span>
        </div>
      </div>

      {/* Title and insight */}
      <h4 className="font-medium text-foreground mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>

      {/* Expandable methodology section */}
      {(factors || methodology) && (
        <div className="mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Info className="h-4 w-4" />
            <span>Як це було розраховано</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 p-3 rounded-md bg-accent/50 border border-border">
              {factors && factors.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Фактори впливу
                  </h5>
                  <ul className="space-y-2">
                    {factors.map((factor, index) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{factor.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{factor.value}</span>
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${factor.weight}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {methodology && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Методологія
                  </h5>
                  <p className="text-sm text-muted-foreground">{methodology}</p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                  Ця аналітика є допоміжною інформацією і не є остаточним рішенням. Фінальне рішення приймає людина.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
