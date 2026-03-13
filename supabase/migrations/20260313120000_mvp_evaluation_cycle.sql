-- ============================================================
-- MVP Evaluation Cycle Migration
-- Tables: cases, case_assignments, case_submissions, interview_sessions
-- ============================================================

-- Generic reusable trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: cases
-- Кейси, які компанія створює для оцінки кандидатів
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cases (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by           UUID        NOT NULL REFERENCES auth.users(id),
  title                TEXT        NOT NULL,
  description          TEXT        NOT NULL,
  context              TEXT,
  -- Масив завдань: [{id, title, description, type}]
  tasks                JSONB       NOT NULL DEFAULT '[]'::jsonb,
  competency_model_id  UUID        REFERENCES public.competency_models(id),
  position_title       TEXT,
  difficulty           TEXT        NOT NULL DEFAULT 'middle'
                                   CHECK (difficulty IN ('junior', 'middle', 'senior')),
  duration_minutes     INTEGER     DEFAULT 60,
  status               TEXT        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'active', 'archived')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Trigger
CREATE TRIGGER cases_set_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: Компанія керує своїми кейсами
CREATE POLICY "Company owners manage their cases"
  ON public.cases
  FOR ALL
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- RLS: Admins
CREATE POLICY "Admins manage all cases"
  ON public.cases
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- NOTE: Кандидатська SELECT-політика додається нижче,
--       після створення таблиці case_assignments.

-- ============================================================
-- TABLE: case_assignments
-- Призначення кейсу конкретному кандидату
-- ============================================================
CREATE TABLE IF NOT EXISTS public.case_assignments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  candidate_id  UUID        NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  assigned_by   UUID        NOT NULL REFERENCES auth.users(id),
  -- pending → in_progress → submitted → evaluated (або expired)
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'in_progress', 'submitted', 'evaluated', 'expired')),
  deadline      TIMESTAMPTZ,
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Кандидат отримує кейс лише один раз
  UNIQUE (case_id, candidate_id)
);

ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- Trigger
CREATE TRIGGER case_assignments_set_updated_at
  BEFORE UPDATE ON public.case_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: Компанія бачить і керує призначеннями для своїх кейсів
CREATE POLICY "Company owners manage assignments for their cases"
  ON public.case_assignments
  FOR ALL
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.companies co ON co.id = c.company_id
      WHERE co.owner_id = auth.uid()
    )
  );

-- RLS: Кандидат бачить свої призначення
CREATE POLICY "Candidates view their own assignments"
  ON public.case_assignments
  FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE user_id = auth.uid()
    )
  );

-- RLS: Кандидат може оновити статус тільки до in_progress або submitted
CREATE POLICY "Candidates update their own assignment status"
  ON public.case_assignments
  FOR UPDATE
  USING (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('in_progress', 'submitted')
  );

-- RLS: Admins
CREATE POLICY "Admins manage all assignments"
  ON public.case_assignments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Кандидатська SELECT-політика для cases
-- Додається тут, після створення case_assignments
-- ============================================================
CREATE POLICY "Candidates view active assigned cases"
  ON public.cases
  FOR SELECT
  USING (
    status = 'active'
    AND id IN (
      SELECT ca.case_id
      FROM public.case_assignments ca
      JOIN public.candidates c ON c.id = ca.candidate_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: case_submissions
-- Відповідь кандидата на кейс
-- ============================================================
CREATE TABLE IF NOT EXISTS public.case_submissions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id        UUID        NOT NULL REFERENCES public.case_assignments(id) ON DELETE CASCADE,
  -- Денормалізовано для зручних запитів без JOIN
  case_id              UUID        NOT NULL REFERENCES public.cases(id),
  candidate_id         UUID        NOT NULL REFERENCES public.candidates(id),
  -- Масив відповідей: [{task_id, answer}]
  answers              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  time_spent_minutes   INTEGER,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: Кандидат бачить і подає свої відповіді
CREATE POLICY "Candidates manage their own submissions"
  ON public.case_submissions
  FOR ALL
  USING (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE user_id = auth.uid()
    )
  );

-- RLS: Компанія бачить відповіді на свої кейси
CREATE POLICY "Companies view submissions for their cases"
  ON public.case_submissions
  FOR SELECT
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.companies co ON co.id = c.company_id
      WHERE co.owner_id = auth.uid()
    )
  );

-- RLS: Admins
CREATE POLICY "Admins manage all submissions"
  ON public.case_submissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- TABLE: interview_sessions
-- Сесія AI-інтерв'ю (може бути прив'язана до кейсу або окрема)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id         UUID        NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  -- Опціональні зв'язки з контекстом
  company_id           UUID        REFERENCES public.companies(id),
  case_id              UUID        REFERENCES public.cases(id),
  assignment_id        UUID        REFERENCES public.case_assignments(id),
  competency_model_id  UUID        REFERENCES public.competency_models(id),
  -- Конфіг інтерв'юера: {id, name, role, department, personality, interviewStyle}
  interviewer_config   JSONB,
  -- Повна історія діалогу: [{role, content, timestamp}]
  messages             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- STAR-оцінки по кожній відповіді (заповнюється поступово)
  star_evaluations     JSONB,
  -- Фінальний звіт AI:
  -- {overall_score, competency_scores, star_analysis,
  --  recommendation, strengths, weaknesses, development_suggestions}
  result               JSONB,
  status               TEXT        NOT NULL DEFAULT 'in_progress'
                                   CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Кандидат повністю керує своїми сесіями
CREATE POLICY "Candidates manage their own interview sessions"
  ON public.interview_sessions
  FOR ALL
  USING (
    candidate_id IN (
      SELECT id FROM public.candidates WHERE user_id = auth.uid()
    )
  );

-- RLS: Компанія бачить завершені сесії своїх кандидатів
CREATE POLICY "Companies view completed sessions for their assignments"
  ON public.interview_sessions
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
    AND status = 'completed'
  );

-- RLS: Admins
CREATE POLICY "Admins manage all interview sessions"
  ON public.interview_sessions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
