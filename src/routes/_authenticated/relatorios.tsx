import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadCsv } from "@/lib/csv";
import { addMonths, dateBr, money, METHOD_LABEL, todaySP } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — OdontoERP" },
      { name: "description", content: "Relatórios de faturamento, produtividade, comparecimento, contas a receber e estoque." },
      { property: "og:title", content: "Relatórios — OdontoERP" },
      { property: "og:description", content: "Relatórios gerenciais da clínica odontológica." },
    ],
  }),
  component: Relatorios,
});

const COLORS = ["var(--primary)", "var(--chart-2)", "var(--chart-1)", "var(--chart-4)", "var(--chart-3)", "var(--chart-5)"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;
const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
const firstOfMonth = (iso: string) => iso.slice(0, 8) + "01";
const lastOfMonth = (iso: string) => prevDay(addMonths(firstOfMonth(iso), 1));
function prevDay(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function presets() {
  const t = todaySP();
  const lm = addMonths(firstOfMonth(t), -1);
  return [
    { label: "Este mês", from: firstOfMonth(t), to: lastOfMonth(t) },
    { label: "Mês passado", from: lm, to: lastOfMonth(lm) },
    { label: "Últimos 3 meses", from: addMonths(firstOfMonth(t), -2), to: lastOfMonth(t) },
    { label: "Este ano", from: t.slice(0, 4) + "-01-01", to: t.slice(0, 4) + "-12-31" },
  ];
}

function Relatorios() {
  const p = presets();
  const [from, setFrom] = useState(p[0]!.from);
  const [to, setTo] = useState(p[0]!.to);
  const startTs = new Date(from + "T00:00:00-03:00").toISOString();
  const endTs = new Date(to + "T23:59:59-03:00").toISOString();

  const dentists = useQuery({
    queryKey: ["rep-dentists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dentists").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });
  const dName = (id: string | null | undefined) => dentists.data?.find((d) => d.id === id)?.name ?? "Sem dentista";

  const payments = useQuery({
    queryKey: ["rep-payments", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("paid_on,method,amount,patient_id,refunded_at").gte("paid_on", from).lte("paid_on", to).is("refunded_at", null);
      if (error) throw error;
      return data;
    },
  });
  // Realized appointments up to period end — used for per-dentist revenue attribution.
  const doneAppts = useQuery({
    queryKey: ["rep-done-appts", to],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("patient_id,dentist_id,starts_at").eq("status", "realizada").lte("starts_at", endTs).order("starts_at");
      if (error) throw error;
      return data;
    },
  });
  const appts = useQuery({
    queryKey: ["rep-appts", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("dentist_id,status").gte("starts_at", startTs).lte("starts_at", endTs);
      if (error) throw error;
      return data;
    },
  });
  const steps = useQuery({
    queryKey: ["rep-steps", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_plan_steps")
        .select("teeth, procedures(code,name), clinical_evolutions!treatment_plan_steps_completed_evolution_id_fkey!inner(created_at)")
        .eq("status", "concluida")
        .gte("clinical_evolutions.created_at", startTs)
        .lte("clinical_evolutions.created_at", endTs);
      if (error) throw error;
      return data as unknown as { teeth: number[]; procedures: { code: string; name: string } | null }[];
    },
  });
  const receivables = useQuery({
    queryKey: ["rep-receivables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receivables").select("due_date,amount,paid_amount,status,installment_no,description,patients(full_name)").neq("status", "pago").order("due_date");
      if (error) throw error;
      return (data as unknown as { due_date: string; amount: number; paid_amount: number; installment_no: number | null; description: string | null; patients: { full_name: string } | null }[]).filter(
        (r) => Number(r.amount) - Number(r.paid_amount) > 0.001,
      );
    },
  });
  const stock = useQuery({
    queryKey: ["rep-stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("name,category,lot,expiry_date,balance,minimum").order("name");
      if (error) throw error;
      return data;
    },
  });

  // 1. Faturamento
  const revenue = useMemo(() => {
    const byMonth = new Map<string, number>();
    const byMethod = new Map<string, number>();
    const byDentist = new Map<string, number>();
    let total = 0;
    for (const pay of payments.data ?? []) {
      const v = Number(pay.amount);
      total += v;
      const ym = pay.paid_on.slice(0, 7);
      byMonth.set(ym, (byMonth.get(ym) ?? 0) + v);
      byMethod.set(pay.method, (byMethod.get(pay.method) ?? 0) + v);
      const payEnd = new Date(pay.paid_on + "T23:59:59-03:00").toISOString();
      const last = (doneAppts.data ?? []).filter((a) => a.patient_id === pay.patient_id && a.starts_at <= payEnd).at(-1);
      const dn = dName(last?.dentist_id);
      byDentist.set(dn, (byDentist.get(dn) ?? 0) + v);
    }
    const months: { name: string; valor: number }[] = [];
    for (let m = firstOfMonth(from); m <= to; m = addMonths(m, 1)) months.push({ name: monthLabel(m), valor: byMonth.get(m.slice(0, 7)) ?? 0 });
    return {
      total,
      months,
      methods: [...byMethod].map(([k, v]) => ({ name: METHOD_LABEL[k] ?? k, valor: v })),
      dentists: [...byDentist].map(([k, v]) => ({ name: k, valor: v })).sort((a, b) => b.valor - a.valor),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments.data, doneAppts.data, dentists.data, from, to]);

  // 2. Produtividade + 3. Comparecimento
  const prod = useMemo(() => {
    const byDentist = new Map<string, { realizada: number; falta: number; cancelada: number }>();
    for (const a of appts.data ?? []) {
      const n = dName(a.dentist_id);
      const e = byDentist.get(n) ?? { realizada: 0, falta: 0, cancelada: 0 };
      if (a.status === "realizada" || a.status === "falta" || a.status === "cancelada") e[a.status]++;
      byDentist.set(n, e);
    }
    const rows = [...byDentist].map(([name, v]) => ({ name, ...v }));
    const tot = rows.reduce((s, r) => ({ realizada: s.realizada + r.realizada, falta: s.falta + r.falta, cancelada: s.cancelada + r.cancelada }), { realizada: 0, falta: 0, cancelada: 0 });
    const procMap = new Map<string, number>();
    for (const s of steps.data ?? []) {
      const k = s.procedures ? `${s.procedures.code} — ${s.procedures.name}` : "—";
      procMap.set(k, (procMap.get(k) ?? 0) + 1);
    }
    const procs = [...procMap].map(([name, qtd]) => ({ name, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
    return { rows, tot, procs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appts.data, steps.data, dentists.data]);
  const attTotal = prod.tot.realizada + prod.tot.falta + prod.tot.cancelada;
  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1).replace(".", ",")}%` : "0%");

  // 4. Contas a receber
  const today = todaySP();
  const aging = useMemo(() => {
    const list = (receivables.data ?? []).map((r) => {
      const late = daysBetween(r.due_date, today);
      const bucket = late <= 0 ? "A vencer" : late <= 30 ? "Vencidas até 30 dias" : "Vencidas há mais de 30 dias";
      return { ...r, saldo: Number(r.amount) - Number(r.paid_amount), late, bucket };
    });
    const buckets = ["A vencer", "Vencidas até 30 dias", "Vencidas há mais de 30 dias"].map((b) => ({
      name: b,
      valor: list.filter((r) => r.bucket === b).reduce((s, r) => s + r.saldo, 0),
      qtd: list.filter((r) => r.bucket === b).length,
    }));
    return { list, buckets };
  }, [receivables.data, today]);

  // 5. Estoque
  const low = (stock.data ?? []).filter((i) => i.balance < i.minimum);
  const expiring = (stock.data ?? []).filter((i) => i.expiry_date && i.balance > 0 && daysBetween(today, i.expiry_date) < 60);

  const periodTag = `${from}_a_${to}`;

  return (
    <>
      <PageHeader title="Relatórios" />
      <main className="space-y-4 p-4 md:p-6">
        <Panel>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap gap-2">
              {p.map((x) => (
                <Button key={x.label} size="sm" variant={from === x.from && to === x.to ? "default" : "outline"} onClick={() => { setFrom(x.from); setTo(x.to); }}>
                  {x.label}
                </Button>
              ))}
            </div>
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 w-40" />
            </div>
            <p className="text-xs text-muted-foreground">O período vale para Faturamento, Produtividade e Comparecimento. Contas a receber e Estoque mostram a situação de hoje.</p>
          </div>
        </Panel>

        <Report
          title={`1. Faturamento — ${money(revenue.total)} recebidos`}
          onExport={() =>
            downloadCsv(`faturamento_${periodTag}.csv`, ["Agrupamento", "Item", "Valor (R$)"], [
              ...revenue.months.map((m) => ["Mês", m.name, m.valor]),
              ...revenue.methods.map((m) => ["Forma de pagamento", m.name, m.valor]),
              ...revenue.dentists.map((m) => ["Dentista", m.name, m.valor]),
            ])
          }
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartBox title="Por mês"><BarChart data={revenue.months}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} width={60} /><Tooltip formatter={(v: number) => money(v)} /><Bar dataKey="valor" name="Recebido" fill={COLORS[0]} radius={[4, 4, 0, 0]} /></BarChart></ChartBox>
            <ChartBox title="Por forma de pagamento">
              <PieChart><Pie data={revenue.methods} dataKey="valor" nameKey="name" outerRadius={70}>{revenue.methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => money(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
            </ChartBox>
            <ChartBox title="Por dentista"><BarChart data={revenue.dentists} layout="vertical"><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" fontSize={11} width={110} /><Tooltip formatter={(v: number) => money(v)} /><Bar dataKey="valor" name="Recebido" fill={COLORS[1]} radius={[0, 4, 4, 0]} /></BarChart></ChartBox>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Estornos não entram no total. Cada recebimento é atribuído ao dentista da última consulta realizada do paciente até a data do pagamento.</p>
        </Report>

        <Report
          title="2. Produtividade"
          onExport={() =>
            downloadCsv(`produtividade_${periodTag}.csv`, ["Tipo", "Item", "Quantidade"], [
              ...prod.rows.map((r) => ["Consultas realizadas", r.name, r.realizada]),
              ...prod.procs.map((r) => ["Procedimento executado", r.name, r.qtd]),
            ])
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartBox title="Consultas realizadas por dentista"><BarChart data={prod.rows}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={30} /><Tooltip /><Bar dataKey="realizada" name="Realizadas" fill={COLORS[0]} radius={[4, 4, 0, 0]} /></BarChart></ChartBox>
            <ChartBox title="Procedimentos mais executados"><BarChart data={prod.procs} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" fontSize={10} width={150} /><Tooltip /><Bar dataKey="qtd" name="Execuções" fill={COLORS[1]} radius={[0, 4, 4, 0]} /></BarChart></ChartBox>
          </div>
        </Report>

        <Report
          title="3. Comparecimento"
          onExport={() =>
            downloadCsv(`comparecimento_${periodTag}.csv`, ["Dentista", "Realizadas", "Faltas", "Canceladas", "% Realizadas", "% Faltas", "% Canceladas"], [
              ...prod.rows.map((r) => { const t = r.realizada + r.falta + r.cancelada; return [r.name, r.realizada, r.falta, r.cancelada, pct(r.realizada, t), pct(r.falta, t), pct(r.cancelada, t)]; }),
              ["Total", prod.tot.realizada, prod.tot.falta, prod.tot.cancelada, pct(prod.tot.realizada, attTotal), pct(prod.tot.falta, attTotal), pct(prod.tot.cancelada, attTotal)],
            ])
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartBox title="Geral">
              <PieChart>
                <Pie data={[{ name: "Realizadas", v: prod.tot.realizada }, { name: "Faltas", v: prod.tot.falta }, { name: "Canceladas", v: prod.tot.cancelada }]} dataKey="v" nameKey="name" outerRadius={70}>
                  <Cell fill="var(--ok, var(--chart-2))" /><Cell fill="var(--chart-1)" /><Cell fill="var(--muted-foreground)" />
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ChartBox>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Dentista</th><th>Realizadas</th><th>Faltas</th><th>Canceladas</th></tr></thead>
                <tbody>
                  {[...prod.rows, { name: "Total", ...prod.tot }].map((r) => { const t = r.realizada + r.falta + r.cancelada; return (
                    <tr key={r.name} className="border-t border-border"><td className="py-2 font-medium">{r.name}</td><td>{r.realizada} ({pct(r.realizada, t)})</td><td>{r.falta} ({pct(r.falta, t)})</td><td>{r.cancelada} ({pct(r.cancelada, t)})</td></tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </div>
        </Report>

        <Report
          title="4. Contas a receber"
          onExport={() =>
            downloadCsv(`contas_a_receber_${today}.csv`, ["Paciente", "Descrição", "Parcela", "Vencimento", "Saldo (R$)", "Faixa"], aging.list.map((r) => [r.patients?.full_name ?? "", r.description ?? "", r.installment_no ?? "", dateBr(r.due_date), r.saldo, r.bucket]))
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartBox title="Saldo em aberto por faixa"><BarChart data={aging.buckets}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={11} width={60} /><Tooltip formatter={(v: number) => money(v)} /><Bar dataKey="valor" name="Saldo" radius={[4, 4, 0, 0]}><Cell fill={COLORS[0]} /><Cell fill="var(--chart-4)" /><Cell fill="var(--chart-1)" /></Bar></BarChart></ChartBox>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground"><tr><th className="py-2">Paciente</th><th>Vencimento</th><th className="text-right">Saldo</th><th>Faixa</th></tr></thead>
                <tbody>
                  {aging.list.map((r, i) => (
                    <tr key={i} className="border-t border-border"><td className="py-1.5">{r.patients?.full_name}</td><td>{dateBr(r.due_date)}</td><td className="text-right">{money(r.saldo)}</td><td className="text-xs">{r.bucket}</td></tr>
                  ))}
                  {!aging.list.length && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Nenhuma parcela em aberto.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Report>

        <Report
          title={`5. Estoque — ${low.length} abaixo do mínimo, ${expiring.length} a vencer em 60 dias`}
          onExport={() =>
            downloadCsv(`estoque_${today}.csv`, ["Situação", "Item", "Categoria", "Lote", "Validade", "Saldo", "Mínimo"], [
              ...low.map((i) => ["Abaixo do mínimo", i.name, i.category ?? "", i.lot ?? "", dateBr(i.expiry_date), i.balance, i.minimum]),
              ...expiring.map((i) => [daysBetween(today, i.expiry_date!) < 0 ? "Vencido" : "Vence em 60 dias", i.name, i.category ?? "", i.lot ?? "", dateBr(i.expiry_date), i.balance, i.minimum]),
            ])
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <StockList title="Abaixo do mínimo" items={low} today={today} />
            <StockList title="A vencer em 60 dias" items={expiring} today={today} showDays />
          </div>
        </Report>
      </main>
    </>
  );
}

function Report({ title, onExport, children }: { title: string; onExport: () => void; children: React.ReactNode }) {
  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        <Button size="sm" variant="outline" onClick={onExport}>Exportar CSV</Button>
      </div>
      {children}
    </Panel>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="h-56"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}

type StockRow = { name: string; category: string | null; lot: string | null; expiry_date: string | null; balance: number; minimum: number };
function StockList({ title, items, today, showDays }: { title: string; items: StockRow[]; today: string; showDays?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <h3 className="mb-1 text-xs font-semibold text-muted-foreground">{title}</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Item</th><th>Lote</th><th>Validade</th><th className="text-right">Saldo / mín.</th></tr></thead>
        <tbody>
          {items.map((i, k) => {
            const d = i.expiry_date ? daysBetween(today, i.expiry_date) : null;
            return (
              <tr key={k} className="border-t border-border">
                <td className="py-1.5">{i.name}</td><td>{i.lot ?? "—"}</td>
                <td>{dateBr(i.expiry_date) || "—"}{showDays && d !== null && <span className="ml-1 text-xs text-muted-foreground">({d < 0 ? "vencido" : `${d} dias`})</span>}</td>
                <td className="text-right">{i.balance} / {i.minimum}</td>
              </tr>
            );
          })}
          {!items.length && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Nenhum item.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
