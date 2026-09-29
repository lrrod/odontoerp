
CREATE TABLE public.clinic_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL, cnpj text, address text, phone text, email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clinic_settings TO authenticated;
GRANT ALL ON public.clinic_settings TO service_role;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic read" ON public.clinic_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "clinic admin write" ON public.clinic_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_clinic_upd BEFORE UPDATE ON public.clinic_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.clinic_settings(id,name,cnpj,address,phone,email) VALUES
 (1,'Clínica Odontológica Sorriso','12.345.678/0001-90','Rua das Flores, 123 — Centro — São Paulo/SP','(11) 3456-7890','contato@clinicasorriso.com.br');

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number serial NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','value')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  installments smallint NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 12),
  first_due date NOT NULL,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','aprovado','recusado')),
  refusal_reason text,
  discount_approved_by uuid,
  discount_approved_name text,
  created_by uuid DEFAULT auth.uid(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
GRANT USAGE ON SEQUENCE public.quotes_number_seq TO authenticated, service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes staff" ON public.quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));
CREATE TRIGGER trg_quotes_upd BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.treatment_plan_steps(id) ON DELETE SET NULL,
  procedure_id uuid REFERENCES public.procedures(id),
  description text NOT NULL,
  teeth smallint[] NOT NULL DEFAULT '{}',
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  position int NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qitems staff read" ON public.quote_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));
CREATE POLICY "qitems staff insert" ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'))
    AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.status = 'aguardando'));

CREATE OR REPLACE FUNCTION public.quotes_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE privileged boolean := public.has_role(auth.uid(),'admin') OR coalesce(auth.role(),'') = 'service_role';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'aguardando' THEN RAISE EXCEPTION 'Orçamento já aprovado ou recusado não pode ser alterado'; END IF;
    IF NEW.subtotal <> OLD.subtotal OR NEW.discount_amount <> OLD.discount_amount OR NEW.total <> OLD.total
       OR NEW.patient_id <> OLD.patient_id OR NEW.discount_approved_by IS DISTINCT FROM OLD.discount_approved_by THEN
      RAISE EXCEPTION 'Valores do orçamento não podem ser alterados; crie um novo orçamento';
    END IF;
    IF NEW.status = 'recusado' AND coalesce(trim(NEW.refusal_reason),'') = '' THEN RAISE EXCEPTION 'Informe o motivo da recusa'; END IF;
    IF NEW.status <> 'aguardando' THEN NEW.decided_at := now(); END IF;
    RETURN NEW;
  END IF;
  IF NEW.status <> 'aguardando' THEN RAISE EXCEPTION 'Novo orçamento deve começar aguardando aprovação'; END IF;
  IF NEW.discount_amount > NEW.subtotal OR abs(NEW.total - (NEW.subtotal - NEW.discount_amount)) > 0.01 THEN
    RAISE EXCEPTION 'Totais do orçamento inconsistentes';
  END IF;
  IF NEW.subtotal > 0 AND NEW.discount_amount / NEW.subtotal > 0.15 THEN
    IF NOT privileged THEN RAISE EXCEPTION 'Desconto acima de 15%% exige autorização do Administrador'; END IF;
    IF NEW.discount_approved_by IS NULL THEN NEW.discount_approved_by := auth.uid(); END IF;
    IF NOT public.has_role(NEW.discount_approved_by,'admin') THEN RAISE EXCEPTION 'Autorizador precisa ser Administrador'; END IF;
    NEW.discount_approved_name := (SELECT full_name FROM public.profiles WHERE id = NEW.discount_approved_by);
  ELSIF NOT privileged THEN
    NEW.discount_approved_by := NULL; NEW.discount_approved_name := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_quotes_guard BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.quotes_guard();

ALTER TABLE public.receivables ADD COLUMN quote_id uuid REFERENCES public.quotes(id),
  ADD COLUMN installment_no smallint, ADD COLUMN paid_amount numeric(12,2) NOT NULL DEFAULT 0;
UPDATE public.receivables SET status = 'aberto' WHERE status <> 'pago';

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no serial NOT NULL,
  receivable_id uuid NOT NULL REFERENCES public.receivables(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  method text NOT NULL CHECK (method IN ('dinheiro','credito','debito','pix')),
  paid_on date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_by uuid, created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  refunded_at timestamptz, refunded_by uuid, refunded_by_name text, refund_reason text
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments staff read" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'));

CREATE OR REPLACE FUNCTION public.payments_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Recebimentos não podem ser excluídos; use o estorno'; END IF;
  IF OLD.refunded_at IS NOT NULL OR NEW.amount <> OLD.amount OR NEW.paid_on <> OLD.paid_on OR NEW.method <> OLD.method
     OR NEW.receivable_id <> OLD.receivable_id OR NEW.receipt_no <> OLD.receipt_no THEN
    RAISE EXCEPTION 'Recebimento registrado não pode ser alterado';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_payments_guard BEFORE UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.payments_guard();

CREATE OR REPLACE FUNCTION public.quote_plan_items(_patient uuid)
RETURNS TABLE(step_id uuid, procedure_id uuid, code text, name text, teeth smallint[], price numeric, step_order int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, p.id, p.code, p.name, s.teeth, p.price, s.step_order
  FROM public.treatment_plan_steps s JOIN public.procedures p ON p.id = s.procedure_id
  WHERE s.patient_id = _patient AND s.status <> 'concluida'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista'))
  ORDER BY s.step_order
$$;

CREATE OR REPLACE FUNCTION public.approve_quote(_quote uuid) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE q record; base numeric; first numeric; i int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = _quote FOR UPDATE;
  IF q IS NULL THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF q.status <> 'aguardando' THEN RAISE EXCEPTION 'Orçamento já decidido'; END IF;
  UPDATE public.quotes SET status = 'aprovado' WHERE id = _quote;
  base := floor(q.total / q.installments * 100) / 100;
  first := q.total - base * (q.installments - 1);
  FOR i IN 1..q.installments LOOP
    INSERT INTO public.receivables(patient_id, description, due_date, amount, status, quote_id, installment_no)
    VALUES (q.patient_id,
      'Orçamento #' || q.number || CASE WHEN q.installments > 1 THEN ' — parcela ' || i || '/' || q.installments ELSE ' — à vista' END,
      (q.first_due + make_interval(months => i - 1))::date,
      CASE WHEN i = 1 THEN first ELSE base END, 'aberto', q.id, i);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.register_payment(_receivable uuid, _method text, _paid_on date, _amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; pid uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcionista')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO r FROM public.receivables WHERE id = _receivable FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'Parcela não encontrada'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Informe um valor maior que zero'; END IF;
  IF _amount > r.amount - r.paid_amount + 0.001 THEN RAISE EXCEPTION 'Valor maior que o saldo da parcela'; END IF;
  INSERT INTO public.payments(receivable_id, patient_id, method, paid_on, amount, created_by, created_by_name)
  VALUES (_receivable, r.patient_id, _method, _paid_on, _amount, auth.uid(),
    coalesce((SELECT full_name FROM public.profiles WHERE id = auth.uid()),'Usuário')) RETURNING id INTO pid;
  UPDATE public.receivables SET paid_amount = paid_amount + _amount,
    status = CASE WHEN paid_amount + _amount >= amount - 0.001 THEN 'pago' ELSE 'aberto' END WHERE id = _receivable;
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.refund_payment(_payment uuid, _reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas o Administrador pode estornar'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Informe o motivo do estorno'; END IF;
  SELECT * INTO p FROM public.payments WHERE id = _payment FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'Recebimento não encontrado'; END IF;
  IF p.refunded_at IS NOT NULL THEN RAISE EXCEPTION 'Recebimento já estornado'; END IF;
  UPDATE public.payments SET refunded_at = now(), refunded_by = auth.uid(), refund_reason = trim(_reason),
    refunded_by_name = coalesce((SELECT full_name FROM public.profiles WHERE id = auth.uid()),'Usuário') WHERE id = _payment;
  UPDATE public.receivables SET paid_amount = greatest(paid_amount - p.amount, 0), status = 'aberto' WHERE id = p.receivable_id;
END $$;
