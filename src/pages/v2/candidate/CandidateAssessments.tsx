// /v2/candidate/assessments — оцінювання кандидата: компетенції + метапрограми.
// Перевикористовує готові компоненти з демо-прототипу (роль «Професіонал»).
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { CompetencyAssessment } from "@/components/professional/CompetencyAssessment";
import { MetaprogramsAnalysis } from "@/components/professional/MetaprogramsAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const CandidateAssessments = () => {
  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Оцінювання</h1>
          <p className="text-muted-foreground mt-1">
            Оцінка за компетенціями та аналіз метапрограм — основа для доказового профілю
          </p>
        </div>

        <Tabs defaultValue="competency" className="space-y-6">
          <TabsList>
            <TabsTrigger value="competency">Компетенції</TabsTrigger>
            <TabsTrigger value="metaprograms">Метапрограми</TabsTrigger>
          </TabsList>

          <TabsContent value="competency">
            <CompetencyAssessment
              onStartAssessment={() => toast.info("Оцінювання компетенцій розпочато (демо)")}
            />
          </TabsContent>

          <TabsContent value="metaprograms">
            <MetaprogramsAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </V2AppLayout>
  );
};

export default CandidateAssessments;
