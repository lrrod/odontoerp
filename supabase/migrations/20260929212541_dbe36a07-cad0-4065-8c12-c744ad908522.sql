ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancel_reason text, ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('agendada','confirmada','em_atendimento','realizada','cancelada','falta'));

CREATE OR REPLACE FUNCTION public.appointments_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_staff boolean := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista');
  local_ts timestamp; wd int; t_start time; t_end time; sch record;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT is_staff AND auth.uid() IS NOT NULL THEN
    IF NEW.starts_at <> OLD.starts_at OR NEW.dentist_id <> OLD.dentist_id OR NEW.patient_id <> OLD.patient_id OR NEW.duration_minutes <> OLD.duration_minutes THEN
      RAISE EXCEPTION 'Apenas a recepção pode remarcar consultas';
    END IF;
  END IF;
  IF NEW.status IN ('cancelada','falta') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.starts_at = OLD.starts_at AND NEW.dentist_id = OLD.dentist_id
     AND NEW.duration_minutes = OLD.duration_minutes AND OLD.status NOT IN ('cancelada','falta') THEN
    RETURN NEW;
  END IF;
  local_ts := NEW.starts_at AT TIME ZONE 'America/Sao_Paulo';
  wd := extract(dow from local_ts)::int;
  t_start := local_ts::time;
  t_end := (local_ts + make_interval(mins => NEW.duration_minutes))::time;
  SELECT * INTO sch FROM public.dentist_schedules WHERE dentist_id = NEW.dentist_id AND weekday = wd LIMIT 1;
  IF sch IS NULL OR t_start < sch.start_time OR t_end > sch.end_time OR t_end <= t_start
     OR (sch.lunch_start IS NOT NULL AND t_start < sch.lunch_end AND t_end > sch.lunch_start) THEN
    RAISE EXCEPTION 'Horário fora da jornada do dentista';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.dentist_id = NEW.dentist_id AND a.id <> NEW.id
      AND a.status NOT IN ('cancelada','falta')
      AND tstzrange(a.starts_at, a.starts_at + make_interval(mins => a.duration_minutes)) &&
          tstzrange(NEW.starts_at, NEW.starts_at + make_interval(mins => NEW.duration_minutes))) THEN
    RAISE EXCEPTION 'Conflito de horário com outra consulta';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.appointments_validate() FROM anon, public;

CREATE TRIGGER trg_appt_validate BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.appointments_validate();