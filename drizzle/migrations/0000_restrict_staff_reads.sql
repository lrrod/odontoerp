CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;
DROP POLICY IF EXISTS "proc read" ON public.procedures;
CREATE POLICY "proc read" ON public.procedures FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "clinic read" ON public.clinic_settings;
CREATE POLICY "clinic read" ON public.clinic_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "schedules read" ON public.dentist_schedules;
CREATE POLICY "schedules read" ON public.dentist_schedules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "dentists read" ON public.dentists;
CREATE POLICY "dentists read" ON public.dentists FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));