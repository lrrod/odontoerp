import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge, APPT_STATUS } from "@/components/StatusBadge";
import { useCurrentUser } from "@/lib/current-user";
import { brl, spDayRange, timeSP } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — OdontoERP" },
      { name: "description", content: "Visão geral do dia da clínica: consultas, pacientes, recebíveis e alertas." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: user } = useCurrentUser();
  const staff = user?.role === "admin" || user?.role === "recepcionista";
  const canChart = user?.role === "admin" || user?.role === "dentista";

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = spDayRange(0);
      const tomorrow = spDayRange(1);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA");
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-CA");
      const [appts, patients, tomorrowCount, recv, stock] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, patient_id, starts_at, procedure, status, patients(full_name), dentists(name)")
          .gte("starts_at", today.start)
          .lt("starts_at", today.end)
          .neq("status", "cancelada")
          .order("starts_at"),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("active", true),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("starts_at", tomorrow.start)
          .lt("starts_at", tomorrow.end),
        staff
          ? supabase.from("receivables").select("amount").neq("status", "pago").gte("due_date", monthStart).lte("due_date", monthEnd)
          : Promise.resolve({ data: [] as { amount: number }[] }),
        supabase.rpc("dashboard_stock_alerts"),
      ]);
      return {
        appts: appts.data ?? [],
        activePatients: patients.count ?? 0,
        tomorrow: tomorrowCount.count ?? 0,
        receivable: (recv.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
        stock: stock.data ?? [],
      };
    },
  });

  const upcoming = (data?.appts ?? []).filter((a) => a.status !== "realizada" && a.status !== "falta");
  const lowStock = (data?.stock ?? []).filter((s) => s.kind === "minimo");

  return (
    <>
      <PageHeader title="Painel — Visão geral do dia" />
      <main className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi value={data?.appts.length ?? "–"} label="Consultas hoje" />
          <Kpi value={data?.activePatients ?? "–"} label="Pacientes ativos" />
          <Kpi value={staff ? (data ? brl(data.receivable) : "–") : "—"} label="A receber no mês" />
          <Kpi value={data ? lowStock.length : "–"} label="Itens abaixo do estoque mínimo" danger />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <Panel title="Próximas consultas de hoje">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-border text-left text-muted-foreground">
                  <th className="px-1.5 py-2 font-bold">Hora</th>
                  <th className="px-1.5 py-2 font-bold">Paciente</th>
                  <th className="px-1.5 py-2 font-bold">Dentista</th>
                  <th className="px-1.5 py-2 font-bold">Procedimento</th>
                  <th className="px-1.5 py-2 font-bold">Status</th>
                  {canChart && <th />}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a) => {
                  const st = APPT_STATUS[a.status] ?? { label: a.status, tone: "info" as const };
                  return (
                    <tr key={a.id} className="border-b border-border">
                      <td className="px-1.5 py-2.5">{timeSP(a.starts_at)}</td>
                      <td className="px-1.5 py-2.5">{a.patients?.full_name}</td>
                      <td className="px-1.5 py-2.5">{a.dentists?.name}</td>
                      <td className="px-1.5 py-2.5">{a.procedure}</td>
                      <td className="px-1.5 py-2.5"><StatusBadge tone={st.tone}>{st.label}</StatusBadge></td>
                      {canChart && (
                        <td className="px-1.5 py-2.5 text-right">
                          <Link to="/prontuarios/$patientId" params={{ patientId: a.patient_id }} search={{ appointment: a.id }}
                            className="font-bold text-primary hover:underline">
                            {a.status === "realizada" ? "Ver" : "Abrir atendimento"}
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {data && upcoming.length === 0 && (
                  <tr><td colSpan={canChart ? 6 : 5} className="py-6 text-center text-muted-foreground">Nenhuma consulta para hoje.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Alertas">
            <ul className="text-[13px]">
              {(data?.stock ?? []).map((s) => (
                <li key={s.name + s.kind} className="flex items-center justify-between gap-2 border-b border-border px-1.5 py-2.5">
                  <span>⚠️ {s.name}</span>
                  {s.kind === "minimo" ? (
                    <StatusBadge tone="alert">Estoque mínimo</StatusBadge>
                  ) : (
                    <StatusBadge tone="warn">
                      {s.days_to_expiry! < 0 ? "Vencido" : `Vence em ${s.days_to_expiry} dias`}
                    </StatusBadge>
                  )}
                </li>
              ))}
              <li className="flex items-center justify-between gap-2 border-b border-border px-1.5 py-2.5">
                <span>🔔 {data?.tomorrow ?? 0} lembretes de consulta para amanhã</span>
                <Link to="/agenda"><StatusBadge tone="info">Enviar</StatusBadge></Link>
              </li>
            </ul>
          </Panel>
        </div>
      </main>
    </>
  );
}

function Kpi({ value, label, danger }: { value: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5">
      <div className={`text-[26px] font-bold ${danger ? "text-alert" : "text-primary"}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
