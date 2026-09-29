import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PrintSheet } from "@/components/PrintSheet";
import { qs, addMonths, dateBr, money, splitInstallments } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/orcamentos/$id/pdf")({
  head: () => ({ meta: [{ title: "Orçamento para impressão — OdontoERP" }, { name: "description", content: "Orçamento odontológico em formato para impressão ou PDF." }] }),
  component: QuotePdf,
});

function QuotePdf() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["quote-pdf", id],
    queryFn: async () => {
      const [q, it] = await Promise.all([
        supabase.from("quotes").select("*, patients(full_name, cpf, phone)").eq("id", id).single(),
        supabase.from("quote_items").select("*").eq("quote_id", id).order("position"),
      ]);
      if (q.error) throw q.error;
      return { q: q.data, items: it.data ?? [] };
    },
  });
  if (!data) return null;
  const { q, items } = data;
  const validity = addMonths(q.created_at.slice(0, 10), 1);
  return (
    <PrintSheet>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-bold">Orçamento nº {q.number}</h1>
        <span>Emitido em {dateBr(q.created_at)} · {qs(q.status).label}</span>
      </div>
      <p className="mb-4"><b>Paciente:</b> {q.patients?.full_name}{q.patients?.phone && <> · {q.patients.phone}</>}</p>
      <table className="mb-4 w-full border-collapse">
        <thead><tr className="border-b border-foreground text-left"><th className="py-1">Procedimento</th><th>Dente(s)</th><th className="text-right">Valor</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-border"><td className="py-1">{i.description}</td><td>{i.teeth.join(", ") || "—"}</td><td className="text-right">{money(i.price)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mb-6 w-64">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(q.subtotal)}</span></div>
        <div className="flex justify-between"><span>Desconto</span><span>− {money(q.discount_amount)}</span></div>
        <div className="flex justify-between border-t border-foreground pt-1 text-base font-bold"><span>Total</span><span>{money(q.total)}</span></div>
      </div>
      <h2 className="mb-1 font-bold">Condições de pagamento</h2>
      {q.installments === 1 ? (
        <p className="mb-6">À vista, com vencimento em {dateBr(q.first_due)}.</p>
      ) : (
        <table className="mb-6 w-full">
          <tbody>
            {splitInstallments(Number(q.total), q.installments, q.first_due).map((p) => (
              <tr key={p.no} className="border-b border-border"><td className="py-0.5">Parcela {p.no}/{q.installments}</td><td>{dateBr(p.due)}</td><td className="text-right">{money(p.amount)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mb-16 text-xs text-muted-foreground">Orçamento válido até {dateBr(validity)}. Valores sujeitos a alteração após o vencimento da validade.</p>
      <div className="grid grid-cols-2 gap-12 text-center text-xs">
        <div className="border-t border-foreground pt-1">Assinatura do paciente</div>
        <div className="border-t border-foreground pt-1">Clínica</div>
      </div>
    </PrintSheet>
  );
}
