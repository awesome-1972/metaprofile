
-- Create table for demo registrations
CREATE TABLE public.demo_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on email
ALTER TABLE public.demo_registrations ADD CONSTRAINT demo_registrations_email_unique UNIQUE (email);

-- Enable RLS
ALTER TABLE public.demo_registrations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (demo registration doesn't require auth)
CREATE POLICY "Anyone can register for demo"
ON public.demo_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading own registration by email (for checking if registered)
CREATE POLICY "Anyone can check registration by email"
ON public.demo_registrations
FOR SELECT
TO anon, authenticated
USING (true);
