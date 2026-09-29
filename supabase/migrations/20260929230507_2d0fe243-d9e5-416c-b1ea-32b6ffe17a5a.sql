ALTER TABLE public.stock_items ADD CONSTRAINT stock_items_category_chk CHECK (category IN ('Restaurador','Descartável','Medicamento','Instrumental','Escritório'));

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.stock_items(id),
  kind text NOT NULL CHECK (kind IN ('entrada','saida','descarte')),
  quantity integer NOT NULL CHECK (quantity > 0),
  supplier text,
  total_value numeric,
  lot text,
  expiry_date date,
  note text,
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Usuário',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements admin read" ON public.stock_movements FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.stock_movements_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Movimentações de estoque não podem ser alteradas nem excluídas'; END $$;
CREATE TRIGGER trg_stock_mov_guard BEFORE UPDATE OR DELETE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.stock_movements_guard();

CREATE OR REPLACE FUNCTION public.stock_entry(_item uuid, _qty integer, _supplier text, _lot text, _expiry date, _value numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; target uuid; who text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'Informe uma quantidade maior que zero'; END IF;
  SELECT * INTO it FROM public.stock_items WHERE id = _item;
  IF it IS NULL THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
  _lot := nullif(trim(_lot),'');
  IF _lot IS NULL OR _lot IS NOT DISTINCT FROM it.lot THEN
    target := it.id;
    UPDATE public.stock_items SET balance = balance + _qty, expiry_date = coalesce(_expiry, expiry_date), lot = coalesce(_lot, lot) WHERE id = target;
  ELSE
    SELECT id INTO target FROM public.stock_items WHERE name = it.name AND lot = _lot LIMIT 1;
    IF target IS NULL THEN
      INSERT INTO public.stock_items(name, category, lot, expiry_date, balance, minimum)
      VALUES (it.name, it.category, _lot, _expiry, _qty, it.minimum) RETURNING id INTO target;
    ELSE
      UPDATE public.stock_items SET balance = balance + _qty, expiry_date = coalesce(_expiry, expiry_date) WHERE id = target;
    END IF;
  END IF;
  who := coalesce((SELECT full_name FROM public.profiles WHERE id = auth.uid()),'Usuário');
  INSERT INTO public.stock_movements(item_id, kind, quantity, supplier, total_value, lot, expiry_date, author_id, author_name)
  VALUES (target, 'entrada', _qty, nullif(trim(_supplier),''), _value, coalesce(_lot, it.lot), coalesce(_expiry, it.expiry_date), auth.uid(), who);
  RETURN target;
END $$;

CREATE OR REPLACE FUNCTION public.stock_exit(_item uuid, _qty integer, _kind text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _kind NOT IN ('saida','descarte') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'Informe uma quantidade maior que zero'; END IF;
  SELECT * INTO it FROM public.stock_items WHERE id = _item FOR UPDATE;
  IF it IS NULL THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
  IF _kind = 'saida' AND it.expiry_date IS NOT NULL AND it.expiry_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'Lote vencido — faça a baixa por descarte';
  END IF;
  IF _qty > it.balance THEN RAISE EXCEPTION 'Quantidade maior que o saldo (%)', it.balance; END IF;
  UPDATE public.stock_items SET balance = balance - _qty WHERE id = _item;
  INSERT INTO public.stock_movements(item_id, kind, quantity, lot, expiry_date, note, author_id, author_name)
  VALUES (_item, _kind, _qty, it.lot, it.expiry_date, nullif(trim(_note),''), auth.uid(),
    coalesce((SELECT full_name FROM public.profiles WHERE id = auth.uid()),'Usuário'));
END $$;
REVOKE EXECUTE ON FUNCTION public.stock_entry(uuid,integer,text,text,date,numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.stock_exit(uuid,integer,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stock_entry(uuid,integer,text,text,date,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stock_exit(uuid,integer,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_stock_alerts()
 RETURNS TABLE(name text, kind text, days_to_expiry integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.name, 'minimo'::text, NULL::integer FROM public.stock_items s
    WHERE s.balance < s.minimum AND auth.uid() IS NOT NULL
  UNION ALL
  SELECT s.name, 'validade'::text, (s.expiry_date - current_date)::integer FROM public.stock_items s
    WHERE s.expiry_date IS NOT NULL AND s.expiry_date < current_date + 60 AND s.balance > 0 AND s.balance >= s.minimum AND auth.uid() IS NOT NULL
$function$;