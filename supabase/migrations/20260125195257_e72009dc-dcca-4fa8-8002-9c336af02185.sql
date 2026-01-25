-- Create competency models table
CREATE TABLE public.competency_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position_title TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create competencies table
CREATE TABLE public.competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.competency_models(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create competency criteria table
CREATE TABLE public.competency_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID REFERENCES public.competencies(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  description TEXT NOT NULL,
  indicators TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competency_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_criteria ENABLE ROW LEVEL SECURITY;

-- Policies for competency_models
CREATE POLICY "Anyone can view active competency models"
ON public.competency_models
FOR SELECT
USING (is_active = true);

CREATE POLICY "Companies can manage their own models"
ON public.competency_models
FOR ALL
USING (company_id = auth.uid())
WITH CHECK (company_id = auth.uid());

-- Policies for competencies
CREATE POLICY "Anyone can view competencies of active models"
ON public.competencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.competency_models 
    WHERE id = model_id AND is_active = true
  )
);

CREATE POLICY "Companies can manage competencies of their models"
ON public.competencies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.competency_models 
    WHERE id = model_id AND company_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.competency_models 
    WHERE id = model_id AND company_id = auth.uid()
  )
);

-- Policies for competency_criteria
CREATE POLICY "Anyone can view criteria of active model competencies"
ON public.competency_criteria
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.competencies c
    JOIN public.competency_models m ON c.model_id = m.id
    WHERE c.id = competency_id AND m.is_active = true
  )
);

CREATE POLICY "Companies can manage criteria of their competencies"
ON public.competency_criteria
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.competencies c
    JOIN public.competency_models m ON c.model_id = m.id
    WHERE c.id = competency_id AND m.company_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.competencies c
    JOIN public.competency_models m ON c.model_id = m.id
    WHERE c.id = competency_id AND m.company_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_competency_model_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_competency_models_updated_at
BEFORE UPDATE ON public.competency_models
FOR EACH ROW
EXECUTE FUNCTION public.update_competency_model_timestamp();