// /v2/candidate/learning — рекомендації розвитку та навчання (AI-підтримка).
// Перевикористовує компонент карʼєрного треку з AI-курсами з демо-прототипу.
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { CareerPathWithAICourses } from "@/components/CareerPathWithAICourses";

const CandidateLearning = () => {
  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Навчання та розвиток</h1>
          <p className="text-muted-foreground mt-1">
            Персональні рекомендації розвитку на основі вашого профілю — з AI-підтримкою
          </p>
        </div>
        <CareerPathWithAICourses role="Спеціаліст" area="Загальний розвиток" />
      </div>
    </V2AppLayout>
  );
};

export default CandidateLearning;
