import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PrintSheet, useClinic } from "@/components/PrintSheet";
import { METHOD_LABEL, dateBr, money } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/financeiro/recibo/$id")({
  head: () => ({ meta: [{ title: "Recibo — OdontoERP" }, { name: "description", content: "Recibo de pagamento para impressão." }] }),
  component: Recibo,
});

function Recibo() {
  const { id } = Route.useParams();
  const { data: clinic } = useClinic();
  const { data: p } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*, patients(full_name, cpf), receivables(description)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  if (!p) return null;
  return (
    <PrintSheet>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-bold">RECIBO nº {String(p.receipt_no).padStart(6, "0")}</h1>
        <span className="text-lg font-bold">{money(p.amount)}</span>
      </div>
      {p.refunded_at && (
        <p className="mb-4 rounded border border-alert p-2 font-bold text-alert">
          ESTORNADO em {dateBr(p.refunded_at)} por {p.refunded_by_name} — motivo: {p.refund_reason}
        </p>
      )}
      <p className="mb-4 leading-7">
        Recebemos de <b>{p.patients?.full_name}</b> a importância de <b>{money(p.amount)}</b>, referente a{" "}
        <b>{p.receivables?.description ?? "tratamento odontológico"}</b>, paga em <b>{METHOD_LABEL[p.method]}</b> na data de <b>{dateBr(p.paid_on)}</b>.
      </p>
      <p className="mb-16">Para clareza, firmamos o presente recibo.</p>
      <div className="mx-auto w-72 border-t border-foreground pt-1 text-center text-xs">
        {clinic?.name}<br />Recebido por {p.created_by_name}
      </div>
    </PrintSheet>
  );
}
