import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface BriefParseQuestion {
  id: string; // "sectionKey.questionKey"
  label: string;
  type: "text" | "textarea" | "radio";
  options?: string[];
}

export interface BriefExtracted {
  id: string;
  value: string;
}

/** Розбір транскрипту розмови у поля бріфу (Edge parse-brief). */
export function useParseBrief() {
  return useMutation({
    mutationFn: async (args: {
      vacancyId: string;
      transcript: string;
      questions: BriefParseQuestion[];
    }): Promise<BriefExtracted[]> => {
      const { data, error } = await supabase.functions.invoke("parse-brief", {
        body: { vacancy_id: args.vacancyId, transcript: args.transcript, questions: args.questions },
      });
      if (error) {
        let detail = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) { const p = await ctx.json(); detail = p.detail || p.error || ""; }
        } catch { /* ignore */ }
        throw new Error(detail || error.message || "Не вдалося розпізнати бріф");
      }
      const list = (data as { extracted?: BriefExtracted[] })?.extracted ?? [];
      return list;
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Не вдалося розпізнати бріф");
    },
  });
}
