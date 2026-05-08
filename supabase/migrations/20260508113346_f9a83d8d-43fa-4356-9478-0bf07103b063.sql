
-- Restrict competency models, competencies, criteria SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view active competency models" ON public.competency_models;
CREATE POLICY "Authenticated can view active competency models"
ON public.competency_models FOR SELECT TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view competencies of active models" ON public.competencies;
CREATE POLICY "Authenticated can view competencies of active models"
ON public.competencies FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.competency_models m WHERE m.id = competencies.model_id AND m.is_active = true));

DROP POLICY IF EXISTS "Anyone can view criteria of active model competencies" ON public.competency_criteria;
CREATE POLICY "Authenticated can view criteria of active model competencies"
ON public.competency_criteria FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.competencies c
  JOIN public.competency_models m ON c.model_id = m.id
  WHERE c.id = competency_criteria.competency_id AND m.is_active = true
));

-- Remove duplicate INSERT policy on user_roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
