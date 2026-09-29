CREATE TABLE public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL, price numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT ALL ON public.procedures TO service_role;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proc read" ON public.procedures FOR SELECT TO authenticated USING (true);
CREATE POLICY "proc admin" ON public.procedures FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_proc_upd BEFORE UPDATE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_access_chart(_patient uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'dentista') AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.patient_id = _patient AND a.dentist_id = public.current_dentist_id()))
$$;

CREATE TABLE public.tooth_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth smallint NOT NULL, face text NOT NULL DEFAULT 'T', condition text NOT NULL,
  updated_by uuid, updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, tooth, face),
  CHECK (face IN ('T','V','L','M','D','O')),
  CHECK (condition IN ('higido','carie','restaurado','canal','ausente','extrair')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tooth_conditions TO authenticated;
GRANT ALL ON public.tooth_conditions TO service_role;
ALTER TABLE public.tooth_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tooth access" ON public.tooth_conditions FOR ALL TO authenticated USING (public.can_access_chart(patient_id)) WITH CHECK (public.can_access_chart(patient_id));

CREATE TABLE public.clinical_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  appointment_id uuid REFERENCES public.appointments(id),
  author_id uuid NOT NULL, author_name text NOT NULL, content text NOT NULL,
  procedures_done text,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.clinical_evolutions TO authenticated;
GRANT ALL ON public.clinical_evolutions TO service_role;
ALTER TABLE public.clinical_evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evo read" ON public.clinical_evolutions FOR SELECT TO authenticated USING (public.can_access_chart(patient_id));
CREATE POLICY "evo insert" ON public.clinical_evolutions FOR INSERT TO authenticated WITH CHECK (public.can_access_chart(patient_id) AND author_id = auth.uid());

CREATE OR REPLACE FUNCTION public.evolutions_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.author_id := auth.uid(); NEW.created_at := now();
    NEW.author_name := COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'Usuário');
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Evoluções gravadas não podem ser alteradas nem excluídas';
END $$;
CREATE TRIGGER trg_evo_guard BEFORE INSERT OR UPDATE OR DELETE ON public.clinical_evolutions FOR EACH ROW EXECUTE FUNCTION public.evolutions_guard();

CREATE TABLE public.treatment_plan_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  procedure_id uuid NOT NULL REFERENCES public.procedures(id),
  teeth smallint[] NOT NULL DEFAULT '{}', step_order int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','andamento','concluida')),
  completed_evolution_id uuid REFERENCES public.clinical_evolutions(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plan_steps TO authenticated;
GRANT ALL ON public.treatment_plan_steps TO service_role;
ALTER TABLE public.treatment_plan_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan access" ON public.treatment_plan_steps FOR ALL TO authenticated USING (public.can_access_chart(patient_id)) WITH CHECK (public.can_access_chart(patient_id));
CREATE TRIGGER trg_plan_upd BEFORE UPDATE ON public.treatment_plan_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.evolution_drafts (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  content text NOT NULL DEFAULT '', step_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_drafts TO authenticated;
GRANT ALL ON public.evolution_drafts TO service_role;
ALTER TABLE public.evolution_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draft access" ON public.evolution_drafts FOR ALL TO authenticated USING (public.can_access_chart(patient_id)) WITH CHECK (public.can_access_chart(patient_id));
CREATE TRIGGER trg_draft_upd BEFORE UPDATE ON public.evolution_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.finalize_appointment(_appointment uuid, _content text, _step_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE appt record; evo_id uuid; done text;
BEGIN
  SELECT * INTO appt FROM public.appointments WHERE id = _appointment;
  IF appt IS NULL THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF NOT public.can_access_chart(appt.patient_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF coalesce(trim(_content),'') = '' THEN RAISE EXCEPTION 'Escreva a evolução do atendimento'; END IF;
  SELECT string_agg(p.code || ' ' || p.name || CASE WHEN array_length(s.teeth,1) > 0 THEN ' (dente ' || array_to_string(s.teeth, ', ') || ')' ELSE '' END, '; ' ORDER BY s.step_order)
    INTO done FROM public.treatment_plan_steps s JOIN public.procedures p ON p.id = s.procedure_id
    WHERE s.id = ANY(coalesce(_step_ids,'{}')) AND s.patient_id = appt.patient_id;
  INSERT INTO public.clinical_evolutions(patient_id, appointment_id, author_id, author_name, content, procedures_done)
    VALUES (appt.patient_id, _appointment, auth.uid(), '', _content, done) RETURNING id INTO evo_id;
  UPDATE public.treatment_plan_steps SET status = 'concluida', completed_evolution_id = evo_id
    WHERE id = ANY(coalesce(_step_ids,'{}')) AND patient_id = appt.patient_id;
  DELETE FROM public.evolution_drafts WHERE appointment_id = _appointment;
  UPDATE public.appointments SET status = 'realizada' WHERE id = _appointment;
  RETURN evo_id;
END $$;
GRANT EXECUTE ON FUNCTION public.finalize_appointment(uuid, text, uuid[]) TO authenticated;

INSERT INTO public.procedures(code, name, price) VALUES
('01','Consulta e avaliação',150),('02','Limpeza (profilaxia)',200),('03','Restauração em resina',280),
('04','Tratamento de canal',900),('05','Extração simples',250),('06','Extração de siso',600),
('07','Clareamento',1200),('08','Coroa de porcelana',2200),('09','Aplicação de flúor',80),('10','Radiografia periapical',60);