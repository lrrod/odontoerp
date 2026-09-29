CREATE TYPE public.app_role AS ENUM ('admin','dentista','recepcionista');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles read own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dentists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  cro text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.dentists TO authenticated;
GRANT ALL ON public.dentists TO service_role;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dentists read" ON public.dentists FOR SELECT TO authenticated USING (true);
CREATE POLICY "dentists admin write" ON public.dentists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_dentists_upd BEFORE UPDATE ON public.dentists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_dentist_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.dentists WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE TABLE public.dentist_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  lunch_start time,
  lunch_end time,
  slot_minutes smallint NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dentist_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dentist_schedules TO authenticated;
GRANT ALL ON public.dentist_schedules TO service_role;
ALTER TABLE public.dentist_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules read" ON public.dentist_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedules admin write" ON public.dentist_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cpf text NOT NULL UNIQUE,
  birth_date date,
  phone text NOT NULL,
  email text,
  insurance text,
  clinical_notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_patients_upd BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  dentist_id uuid NOT NULL REFERENCES public.dentists(id),
  starts_at timestamptz NOT NULL,
  duration_minutes smallint NOT NULL DEFAULT 40,
  procedure text NOT NULL,
  status text NOT NULL DEFAULT 'agendada',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_appt_upd BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "appt staff all" ON public.appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));
CREATE POLICY "appt dentist own read" ON public.appointments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'dentista') AND dentist_id = public.current_dentist_id());
CREATE POLICY "appt dentist own update" ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'dentista') AND dentist_id = public.current_dentist_id())
  WITH CHECK (dentist_id = public.current_dentist_id());

CREATE POLICY "patients staff read" ON public.patients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));
CREATE POLICY "patients dentist read own" ON public.patients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'dentista') AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.patient_id = patients.id AND a.dentist_id = public.current_dentist_id()));
CREATE POLICY "patients staff insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));
CREATE POLICY "patients staff update" ON public.patients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));

-- CPF duplicate check without exposing data beyond id
CREATE OR REPLACE FUNCTION public.find_patient_by_cpf(_cpf text)
RETURNS TABLE (id uuid, full_name text, active boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.active FROM public.patients p
  WHERE p.cpf = _cpf AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'))
$$;

CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  description text,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.receivables TO authenticated;
GRANT ALL ON public.receivables TO service_role;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_recv_upd BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "recv staff" ON public.receivables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));

CREATE TABLE public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  lot text,
  expiry_date date,
  balance integer NOT NULL DEFAULT 0,
  minimum integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_stock_upd BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "stock admin" ON public.stock_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Dashboard stock alerts for any staff member (names only)
CREATE OR REPLACE FUNCTION public.dashboard_stock_alerts()
RETURNS TABLE (name text, kind text, days_to_expiry integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.name, 'minimo'::text, NULL::integer FROM public.stock_items s
    WHERE s.balance < s.minimum AND auth.uid() IS NOT NULL
  UNION ALL
  SELECT s.name, 'validade'::text, (s.expiry_date - current_date)::integer FROM public.stock_items s
    WHERE s.expiry_date IS NOT NULL AND s.expiry_date <= current_date + 45 AND s.balance >= s.minimum AND auth.uid() IS NOT NULL
$$;

CREATE TABLE public.login_attempts (
  email text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Seed data
INSERT INTO public.dentists (id, name, cro) VALUES
 ('11111111-1111-1111-1111-111111111111','Dr. Carlos Prado','CRO-SP 45123'),
 ('22222222-2222-2222-2222-222222222222','Dra. Paula Nunes','CRO-SP 51877');

INSERT INTO public.dentist_schedules (dentist_id, weekday, start_time, end_time, lunch_start, lunch_end, slot_minutes)
SELECT d, w, '08:00','18:00','12:00','13:30',40
FROM unnest(ARRAY['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222']::uuid[]) d,
     generate_series(1,5) w;

INSERT INTO public.patients (id, full_name, cpf, birth_date, phone, email, insurance, clinical_notes, active) VALUES
 ('a0000000-0000-0000-0000-000000000001','Marina Lopes','41253687490','1988-03-12','(11) 98877-1234','marina.lopes@email.com','OdontoPlus',NULL,true),
 ('a0000000-0000-0000-0000-000000000002','João Pedro Ramos','38816547211','1975-07-22','(11) 97712-4567',NULL,NULL,'Hipertenso',true),
 ('a0000000-0000-0000-0000-000000000003','Helena Martins','29571834673','1992-11-02','(11) 96641-8910','helena.m@email.com','DentalCare',NULL,true),
 ('a0000000-0000-0000-0000-000000000004','Rafael Costa','17465298325','1990-01-15','(11) 95530-1122',NULL,NULL,'Alergia a penicilina',true),
 ('a0000000-0000-0000-0000-000000000005','Beatriz Nogueira','50237416948','1983-05-30','(11) 94429-3344',NULL,'OdontoPlus',NULL,false),
 ('a0000000-0000-0000-0000-000000000006','Lucas Andrade','62918473502','2001-09-09','(11) 99123-4455','lucas.a@email.com','Amil Dental',NULL,true),
 ('a0000000-0000-0000-0000-000000000007','Fernanda Oliveira','73482915606','1979-12-18','(11) 98234-5566',NULL,NULL,'Diabética tipo 2',true),
 ('a0000000-0000-0000-0000-000000000008','Gabriel Souza','84573026109','1995-04-04','(11) 97345-6677',NULL,'OdontoPlus',NULL,true),
 ('a0000000-0000-0000-0000-000000000009','Camila Ferreira','95614738208','1987-08-27','(11) 96456-7788','camila.f@email.com',NULL,'Gestante',true),
 ('a0000000-0000-0000-0000-000000000010','Pedro Henrique Alves','10725849300','1968-02-14','(11) 95567-8899',NULL,'DentalCare',NULL,true),
 ('a0000000-0000-0000-0000-000000000011','Juliana Rocha','21836950476','1999-06-21','(11) 94678-9900',NULL,NULL,'Alergia a látex',true),
 ('a0000000-0000-0000-0000-000000000012','Thiago Barbosa','32947061555','1985-10-10','(11) 93789-0011',NULL,'Amil Dental',NULL,false);

INSERT INTO public.appointments (patient_id, dentist_id, starts_at, procedure, status) VALUES
 ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',(current_date + time '09:00') AT TIME ZONE 'America/Sao_Paulo','Avaliação','confirmada'),
 ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',(current_date + time '09:40') AT TIME ZONE 'America/Sao_Paulo','Restauração 26','agendada'),
 ('a0000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222',(current_date + time '10:30') AT TIME ZONE 'America/Sao_Paulo','Limpeza','confirmada'),
 ('a0000000-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222',(current_date + time '11:10') AT TIME ZONE 'America/Sao_Paulo','Canal 36 — sessão 2','em_atendimento'),
 ('a0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111',(current_date + time '14:00') AT TIME ZONE 'America/Sao_Paulo','Profilaxia','agendada'),
 ('a0000000-0000-0000-0000-000000000007','22222222-2222-2222-2222-222222222222',(current_date + time '15:20') AT TIME ZONE 'America/Sao_Paulo','Extração 48','agendada'),
 ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',(current_date + 1 + time '09:00') AT TIME ZONE 'America/Sao_Paulo','Retorno','agendada'),
 ('a0000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111',(current_date + 1 + time '10:20') AT TIME ZONE 'America/Sao_Paulo','Clareamento','agendada'),
 ('a0000000-0000-0000-0000-000000000009','22222222-2222-2222-2222-222222222222',(current_date + 1 + time '09:40') AT TIME ZONE 'America/Sao_Paulo','Avaliação','agendada'),
 ('a0000000-0000-0000-0000-000000000010','22222222-2222-2222-2222-222222222222',(current_date + 1 + time '14:00') AT TIME ZONE 'America/Sao_Paulo','Restauração 14','agendada'),
 ('a0000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111',(current_date + 1 + time '15:20') AT TIME ZONE 'America/Sao_Paulo','Manutenção ortodôntica','agendada');

INSERT INTO public.receivables (patient_id, description, due_date, amount, status) VALUES
 ('a0000000-0000-0000-0000-000000000004','Orçamento 2026-041 — parcela 1', date_trunc('month', current_date)::date + 9, 350,'vencido'),
 ('a0000000-0000-0000-0000-000000000004','Orçamento 2026-041 — parcela 2', date_trunc('month', current_date)::date + 24, 350,'aberto'),
 ('a0000000-0000-0000-0000-000000000001','Avaliação e limpeza', date_trunc('month', current_date)::date + 19, 280,'aberto'),
 ('a0000000-0000-0000-0000-000000000003','Clareamento — parcela 1', date_trunc('month', current_date)::date + 14, 600,'aberto'),
 ('a0000000-0000-0000-0000-000000000006','Restauração', date_trunc('month', current_date)::date + 27, 420,'aberto');

INSERT INTO public.stock_items (name, category, lot, expiry_date, balance, minimum) VALUES
 ('Resina composta A2','Restaurador','L-2231','2027-05-31',2,5),
 ('Luvas M (cx 100)','Descartável','L-1180','2028-01-31',1,4),
 ('Anestésico lidocaína 2%','Medicamento','L-0912', current_date + 32,12,6),
 ('Sugador descartável','Descartável','L-3300','2028-07-31',240,80),
 ('Agulha gengival curta','Descartável','L-2094','2028-03-31',65,30);