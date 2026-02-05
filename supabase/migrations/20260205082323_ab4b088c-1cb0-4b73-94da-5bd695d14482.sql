-- Fix RLS policies for signup flow
-- Drop existing restrictive policies and create proper ones

-- Profiles: allow users to insert their own profile during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User roles: allow users to insert their own role during signup
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can insert own role" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Companies: allow authenticated users to create companies they own
DROP POLICY IF EXISTS "Users can create own company" ON public.companies;
CREATE POLICY "Users can create own company" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Candidates: allow users to create their own candidate profile
DROP POLICY IF EXISTS "Users can insert own candidate profile" ON public.candidates;
CREATE POLICY "Users can insert own candidate profile" 
ON public.candidates 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);