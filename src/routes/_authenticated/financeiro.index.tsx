import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { fieldCls, labelCls } from "@/components/AuthCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/current-user";
import { METHODS, METHOD_LABEL, addMonths, dateBr, money, receivableStatus, round2, todaySP } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/financeiro/")({
  head: () => ({
    meta: [
      { title: "Financeiro — OdontoERP" },
      { name: "description", content: "Parcelas, recebimentos, recibos e resumo mensal da clínica no OdontoERP." },
    ],
  }),
  component: Financeiro,
});

const btn = "rounded-md bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "rounded-md border border-border px-3 py-2 text-[13px] font-bold hover:bg-muted disabled:opacity-50";

type Recv = { id: string; description: string | null; due_date: string; amount: number; paid_amount: number; status: string; patient_id: string; patients: { full_name: string } | null };

function Financeiro() {
  const today = todaySP();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [onlyMonth, setOnlyMonth] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const mStart = `${month}-01`;
  const mEnd = addMonths(mStart, 1);

  const { data: recvs = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receivables").select("id, description, due_date, amount, paid_amount, status, patient_id, patients(full_name)").order("due_date");
      if (error) throw error;
      return data as Recv[];
    },
  });
  const { data: monthPays = [] } = useQuery({
    queryKey: ["payments-month", month],
    queryFn: async () => (await supabase.from("payments").select("amount").is("refunded_at", null).gte("paid_on", mStart).lt("paid_on", mEnd)).data ?? [],
  });

  const inMonth = recvs.filter((r) => r.due_date >= mStart && r.due_date < mEnd);
  const bal = (r: Recv) => round2(Number(r.amount) - Number(r.paid_amount));
  const received = monthPays.reduce((s, p) => s + Number(p.amount), 0);
  const toReceive = inMonth.filter((r) => r.due_date >= today).reduce((s, r) => s + bal(r), 0);
  const overdue = inMonth.filter((r) => r.due_date < today).reduce((s, r) => s + bal(r), 0);

  const list = (onlyMonth ? inMonth : recvs).filter((r) =>
    (r.patients?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) &&
    (status === "todos" || receivableStatus(r, today).key === status));

  return (
    <>
      <PageHeader title="Financeiro" />
      <main className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold">Mês:</span>
          <input type="month" className={`${fieldCls} w-44`} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card label="Recebido no mês" value={received} tone="text-ok" />
          <Card label="A receber" value={toReceive} tone="text-info" />
          <Card label="Vencido" value={overdue} tone="text-alert" />
        </div>
        <Panel title="Parcelas">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className={`${fieldCls} max-w-xs`} placeholder="Buscar paciente…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={`${fieldCls} max-w-[180px]`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todos">Todos os status</option><option value="aberto">Em aberto</option><option value="paga">Paga</option><option value="vencida">Vencida</option>
            </select>
            <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={onlyMonth} onChange={(e) => setOnlyMonth(e.target.checked)} /> Somente vencimentos do mês</label>
          </div>
          <table className="w-full text-[13px]">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Paciente</th><th>Descrição</th><th>Vencimento</th><th className="text-right">Valor</th><th className="text-right">Pago</th><th className="text-right">Saldo</th><th className="pl-4">Status</th></tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const st = receivableStatus(r, today);
                return (
                  <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => setOpenId(r.id)}>
                    <td className="py-2 font-bold">{r.patients?.full_name}</td>
                    <td>{r.description}</td>
                    <td>{dateBr(r.due_date)}</td>
                    <td className="text-right">{money(r.amount)}</td>
                    <td className="text-right">{money(r.paid_amount)}</td>
                    <td className="text-right font-bold">{money(bal(r))}</td>
                    <td className="pl-4"><StatusBadge tone={st.tone}>{st.label}</StatusBadge></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Nenhuma parcela encontrada.</td></tr>}
            </tbody>
          </table>
        </Panel>
      </main>
      {openId && <ReceivableDetail recv={recvs.find((r) => r.id === openId)!} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Card({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{money(value)}</div>
    </div>
  );
}

function ReceivableDetail({ recv, onClose }: { recv: Recv; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const balance = round2(Number(recv.amount) - Number(recv.paid_amount));
  const [method, setMethod] = useState("pix");
  const [paidOn, setPaidOn] = useState(todaySP());
  const [amount, setAmount] = useState(balance.toFixed(2).replace(".", ","));
  useEffect(() => setAmount(balance.toFixed(2).replace(".", ",")), [balance]);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: pays = [] } = useQuery({
    queryKey: ["payments", recv.id],
    queryFn: async () => (await supabase.from("payments").select("*").eq("receivable_id", recv.id).order("created_at")).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["receivables"] }); qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["payments-month"] }); };

  const value = Number(amount.replace(/\./g, "").replace(",", ".")) || 0;
  const pay = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("register_payment", { _receivable: recv.id, _method: method, _paid_on: paidOn, _amount: value });
      if (error) throw error;
      return data;
    },
    onSuccess: (pid) => { toast.success("Recebimento registrado"); refresh(); navigate({ to: "/financeiro/recibo/$id", params: { id: pid } }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const refund = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("refund_payment", { _payment: refundId!, _reason: reason }); if (error) throw error; },
    onSuccess: () => { toast.success("Recebimento estornado"); setRefundId(null); setReason(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{recv.patients?.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-[13px]">
          <div className="grid grid-cols-4 gap-2 rounded-md bg-muted/50 p-3">
            <div className="col-span-4 font-bold">{recv.description}</div>
            <div>Vencimento<br /><b>{dateBr(recv.due_date)}</b></div>
            <div>Valor<br /><b>{money(recv.amount)}</b></div>
            <div>Pago<br /><b>{money(recv.paid_amount)}</b></div>
            <div>Saldo<br /><b>{money(balance)}</b></div>
          </div>

          <div>
            <div className={labelCls}>Recebimentos</div>
            {!pays.length && <p className="text-muted-foreground">Nenhum recebimento registrado.</p>}
            {pays.map((p) => (
              <div key={p.id} className="border-t border-border py-2">
                <div className="flex items-center gap-2">
                  <span className={p.refunded_at ? "text-muted-foreground line-through" : "font-bold"}>{money(p.amount)}</span>
                  <span>{METHOD_LABEL[p.method]} · {dateBr(p.paid_on)} · recibo nº {p.receipt_no} · {p.created_by_name}</span>
                  {p.refunded_at && <StatusBadge tone="alert">Estornado</StatusBadge>}
                  <span className="ml-auto flex gap-1">
                    <button className={btnGhost} onClick={() => navigate({ to: "/financeiro/recibo/$id", params: { id: p.id } })}>Recibo</button>
                    {me?.role === "admin" && !p.refunded_at && <button className={btnGhost} onClick={() => setRefundId(p.id)}>Estornar</button>}
                  </span>
                </div>
                {p.refunded_at && <div className="text-xs text-alert">Estornado em {dateBr(p.refunded_at)} por {p.refunded_by_name} — {p.refund_reason}</div>}
                {refundId === p.id && (
                  <div className="mt-2 flex gap-2">
                    <input className={fieldCls} placeholder="Motivo do estorno (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <button className={btnGhost} onClick={() => setRefundId(null)}>Cancelar</button>
                    <button className={btn} disabled={!reason.trim() || refund.isPending} onClick={() => refund.mutate()}>Confirmar estorno</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {balance > 0 && (
            <div className="rounded-md border border-border p-3">
              <div className="mb-2 font-bold">Registrar recebimento</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Forma de pagamento</label>
                  <select className={fieldCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Data</label><input type="date" className={fieldCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
                <div><label className={labelCls}>Valor (R$)</label><input className={fieldCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              </div>
              {value > balance + 0.001 && <p className="mt-1 text-xs text-alert">O valor não pode ser maior que o saldo ({money(balance)}).</p>}
              {value > 0 && value < balance - 0.001 && <p className="mt-1 text-xs text-muted-foreground">Pagamento parcial: ficará um saldo em aberto de {money(balance - value)}.</p>}
              <div className="mt-2 flex justify-end">
                <button className={btn} disabled={value <= 0 || value > balance + 0.001 || !paidOn || pay.isPending} onClick={() => pay.mutate()}>Registrar e emitir recibo</button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
