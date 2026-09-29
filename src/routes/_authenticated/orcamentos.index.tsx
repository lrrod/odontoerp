import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { fieldCls, labelCls } from "@/components/AuthCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/current-user";
import { QUOTE_STATUS, dateBr, money, round2, splitInstallments, todaySP } from "@/lib/finance";
import { createQuoteWithAdminAuth } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_authenticated/orcamentos/")({
  head: () => ({
    meta: [
      { title: "Orçamentos — OdontoERP" },
      { name: "description", content: "Orçamentos de tratamento, descontos, parcelamento e aprovação no OdontoERP." },
    ],
  }),
  component: Orcamentos,
});

const btn = "rounded-md bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "rounded-md border border-border px-3 py-2 text-[13px] font-bold hover:bg-muted disabled:opacity-50";

function Orcamentos() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, number, total, installments, status, created_at, patients(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const list = quotes.filter(
    (q) => (status === "todos" || q.status === status) &&
      (q.patients?.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader title="Orçamentos" />
      <main className="space-y-4 p-6">
        <Panel>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className={`${fieldCls} max-w-xs`} placeholder="Buscar paciente…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={`${fieldCls} max-w-[220px]`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todos">Todos os status</option>
              {Object.entries(QUOTE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className={`${btn} ml-auto`} onClick={() => setCreating(true)}>+ Novo orçamento</button>
          </div>
          <table className="w-full text-[13px]">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Nº</th><th>Paciente</th><th>Data</th><th>Condição</th><th className="text-right">Total</th><th className="pl-4">Status</th></tr>
            </thead>
            <tbody>
              {list.map((q) => (
                <tr key={q.id} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => setOpenId(q.id)}>
                  <td className="py-2 font-bold">#{q.number}</td>
                  <td>{q.patients?.full_name}</td>
                  <td>{dateBr(q.created_at)}</td>
                  <td>{q.installments === 1 ? "À vista" : `${q.installments}x`}</td>
                  <td className="text-right font-bold">{money(q.total)}</td>
                  <td className="pl-4"><StatusBadge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</StatusBadge></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum orçamento encontrado.</td></tr>}
            </tbody>
          </table>
        </Panel>
      </main>
      {creating && <NewQuote onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />}
      {openId && <QuoteDetail id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

type Item = { key: string; step_id: string | null; procedure_id: string | null; description: string; teeth: number[]; price: number; selected: boolean };

function NewQuote({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const createWithAuth = useServerFn(createQuoteWithAdminAuth);
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [dType, setDType] = useState<"percent" | "value">("percent");
  const [dValue, setDValue] = useState("0");
  const [n, setN] = useState(1);
  const [firstDue, setFirstDue] = useState(todaySP());
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [extraProc, setExtraProc] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-active-min"],
    queryFn: async () => (await supabase.from("patients").select("id, full_name").eq("active", true).order("full_name")).data ?? [],
  });
  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures-active"],
    queryFn: async () => (await supabase.from("procedures").select("id, code, name, price").eq("active", true).order("code")).data ?? [],
  });

  async function pickPatient(id: string) {
    setPatientId(id);
    setItems([]);
    if (!id) return;
    const { data, error } = await supabase.rpc("quote_plan_items", { _patient: id });
    if (error) return toast.error(error.message);
    setItems((data ?? []).map((s) => ({
      key: s.step_id, step_id: s.step_id, procedure_id: s.procedure_id, description: `${s.code} ${s.name}`,
      teeth: s.teeth ?? [], price: Number(s.price), selected: true,
    })));
    if (!data?.length) toast.info("Este paciente não tem etapas pendentes no plano de tratamento. Adicione procedimentos manualmente.");
  }

  function addExtra() {
    const p = procedures.find((x) => x.id === extraProc);
    if (!p) return;
    setItems((it) => [...it, { key: crypto.randomUUID(), step_id: null, procedure_id: p.id, description: `${p.code} ${p.name}`, teeth: [], price: Number(p.price), selected: true }]);
    setExtraProc("");
  }

  const chosen = items.filter((i) => i.selected);
  const subtotal = round2(chosen.reduce((s, i) => s + i.price, 0));
  const dv = Math.max(0, Number(dValue.replace(",", ".")) || 0);
  const discount = round2(Math.min(subtotal, dType === "percent" ? (subtotal * Math.min(dv, 100)) / 100 : dv));
  const total = round2(subtotal - discount);
  const pct = subtotal ? (discount / subtotal) * 100 : 0;
  const needsAuth = pct > 15 + 1e-9;
  const needsAdminCreds = needsAuth && me?.role !== "admin";
  const parcels = useMemo(() => (total > 0 && firstDue ? splitInstallments(total, n, firstDue) : []), [total, n, firstDue]);

  const save = useMutation({
    mutationFn: async () => {
      const quote = { patient_id: patientId, subtotal, discount_type: dType, discount_value: dv, discount_amount: discount, total, installments: n, first_due: firstDue };
      const its = chosen.map((i, idx) => ({ step_id: i.step_id, procedure_id: i.procedure_id, description: i.description, teeth: i.teeth, price: i.price, position: idx + 1 }));
      if (needsAdminCreds) {
        const r = await createWithAuth({ data: { quote, items: its, admin: { email: adminEmail, password: adminPass } } });
        if (!r.ok) throw new Error(r.error);
        return r.id;
      }
      const { data: q, error } = await supabase.from("quotes").insert(quote).select("id").single();
      if (error) throw error;
      const { error: ie } = await supabase.from("quote_items").insert(its.map((i) => ({ ...i, quote_id: q.id })));
      if (ie) throw ie;
      return q.id;
    },
    onSuccess: (id) => {
      toast.success("Orçamento criado");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      onCreated(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave = patientId && chosen.length > 0 && firstDue && (!needsAdminCreds || (adminEmail && adminPass));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>
        <div className="space-y-4 text-[13px]">
          <div>
            <label className={labelCls}>Paciente</label>
            <select className={fieldCls} value={patientId} onChange={(e) => pickPatient(e.target.value)}>
              <option value="">Selecione…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          {patientId && (
            <>
              <div>
                <div className={labelCls}>Itens (plano de tratamento)</div>
                <table className="w-full">
                  <thead className="text-left text-xs text-muted-foreground"><tr><th className="w-8" /><th className="py-1">Procedimento</th><th>Dente(s)</th><th className="text-right">Valor</th></tr></thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.key} className="border-t border-border">
                        <td className="py-1.5"><input type="checkbox" checked={i.selected} onChange={(e) => setItems((it) => it.map((x) => x.key === i.key ? { ...x, selected: e.target.checked } : x))} /></td>
                        <td>{i.description}</td>
                        <td>{i.teeth.length ? i.teeth.join(", ") : "—"}</td>
                        <td className="text-right">{money(i.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex gap-2">
                  <select className={fieldCls} value={extraProc} onChange={(e) => setExtraProc(e.target.value)}>
                    <option value="">Adicionar procedimento avulso…</option>
                    {procedures.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name} — {money(Number(p.price))}</option>)}
                  </select>
                  <button type="button" className={btnGhost} disabled={!extraProc} onClick={addExtra}>Adicionar</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Desconto</label>
                  <div className="flex gap-1">
                    <select className={`${fieldCls} w-20`} value={dType} onChange={(e) => setDType(e.target.value as "percent" | "value")}>
                      <option value="percent">%</option><option value="value">R$</option>
                    </select>
                    <input className={fieldCls} inputMode="decimal" value={dValue} onChange={(e) => setDValue(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Condição</label>
                  <select className={fieldCls} value={n} onChange={(e) => setN(Number(e.target.value))}>
                    <option value={1}>À vista</option>
                    {Array.from({ length: 11 }, (_, i) => i + 2).map((k) => <option key={k} value={k}>{k}x</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{n === 1 ? "Vencimento" : "1º vencimento"}</label>
                  <input type="date" className={fieldCls} value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="flex justify-between"><span>Desconto ({pct.toFixed(1).replace(".", ",")}%)</span><span>− {money(discount)}</span></div>
                <div className="mt-1 flex justify-between text-[15px] font-bold"><span>Total</span><span>{money(total)}</span></div>
                {parcels.length > 1 && (
                  <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                    {parcels.map((p) => <div key={p.no}>{p.no}ª {dateBr(p.due)} — <b className="text-foreground">{money(p.amount)}</b></div>)}
                  </div>
                )}
              </div>
              {needsAuth && (
                <div className="rounded-md border border-warn bg-warn-bg p-3">
                  <div className="mb-2 font-bold text-warn">Desconto acima de 15% — autorização do Administrador</div>
                  {me?.role === "admin" ? (
                    <p>Você é Administrador; o desconto será registrado como autorizado por você.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input className={fieldCls} placeholder="E-mail do Administrador" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoComplete="off" />
                      <input className={fieldCls} type="password" placeholder="Senha do Administrador" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} autoComplete="new-password" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btn} disabled={!canSave || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando…" : "Salvar orçamento"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuoteDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const { data } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const [q, it] = await Promise.all([
        supabase.from("quotes").select("*, patients(full_name)").eq("id", id).single(),
        supabase.from("quote_items").select("*").eq("quote_id", id).order("position"),
      ]);
      if (q.error) throw q.error;
      return { q: q.data, items: it.data ?? [] };
    },
  });
  const done = () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["quote", id] }); qc.invalidateQueries({ queryKey: ["receivables"] }); };
  const approve = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("approve_quote", { _quote: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Orçamento aprovado — parcelas lançadas no Financeiro"); done(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const refuse = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("quotes").update({ status: "recusado", refusal_reason: reason.trim() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Orçamento recusado"); setRefusing(false); done(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const q = data?.q;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Orçamento {q ? `#${q.number}` : ""}</DialogTitle></DialogHeader>
        {q && (
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <div><b>{q.patients?.full_name}</b> · {dateBr(q.created_at)}</div>
              <StatusBadge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</StatusBadge>
            </div>
            <table className="w-full">
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id} className="border-t border-border"><td className="py-1.5">{i.description}</td><td>{i.teeth.length ? `Dente ${i.teeth.join(", ")}` : ""}</td><td className="text-right">{money(i.price)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(q.subtotal)}</span></div>
              <div className="flex justify-between"><span>Desconto</span><span>− {money(q.discount_amount)}</span></div>
              {q.discount_approved_name && <div className="text-xs text-muted-foreground">Desconto autorizado por {q.discount_approved_name}</div>}
              <div className="mt-1 flex justify-between text-[15px] font-bold"><span>Total</span><span>{money(q.total)}</span></div>
              <div className="mt-2 text-xs text-muted-foreground">
                {q.installments === 1 ? `À vista — vencimento ${dateBr(q.first_due)}` :
                  splitInstallments(Number(q.total), q.installments, q.first_due).map((p) => `${p.no}ª ${dateBr(p.due)} ${money(p.amount)}`).join(" · ")}
              </div>
            </div>
            {q.status === "recusado" && <p className="text-alert"><b>Motivo da recusa:</b> {q.refusal_reason}</p>}
            {refusing && (
              <div>
                <label className={labelCls}>Motivo da recusa</label>
                <textarea className={fieldCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Link to="/orcamentos/$id/pdf" params={{ id }} className={btnGhost}>Gerar PDF</Link>
              {q.status === "aguardando" && !refusing && (
                <>
                  <button className={btnGhost} onClick={() => setRefusing(true)}>Recusar</button>
                  <button className={btn} disabled={approve.isPending} onClick={() => approve.mutate()}>Aprovar</button>
                </>
              )}
              {refusing && (
                <>
                  <button className={btnGhost} onClick={() => setRefusing(false)}>Voltar</button>
                  <button className={btn} disabled={!reason.trim() || refuse.isPending} onClick={() => refuse.mutate()}>Confirmar recusa</button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

