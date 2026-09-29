import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { APPT_STATUS, StatusBadge } from "@/components/StatusBadge";
import { spDayRange, timeSP } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/prontuarios/")({
  head: () => ({
    meta: [
      { title: "Prontuários — OdontoERP" },
      { name: "description", content: "Atendimentos do dia e prontuários dos pacientes no OdontoERP." },
    ],
  }),
  component: Prontuarios,
});

function Prontuarios() {
  const [q, setQ] = useState("");
  const today = useQuery({
    queryKey: ["appointments", "chart-today"],
    queryFn: async () => {
      const r = spDayRange(0);
      const { data } = await supabase.from("appointments")
        .select("id, patient_id, starts_at, procedure, status, patients(full_name), dentists(name)")
        .gte("starts_at", r.start).lt("starts_at", r.end).not("status", "in", "(cancelada,falta)").order("starts_at");
      return data ?? [];
    },
  });
  const patients = useQuery({
    queryKey: ["chart-patients", q],
    queryFn: async () => {
      let s = supabase.from("patients").select("id, full_name, insurance").order("full_name").limit(30);
      if (q.trim()) s = s.ilike("full_name", `%${q.trim()}%`);
      const { data } = await s;
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader title="Prontuários" />
      <main className="grid gap-4 p-6 lg:grid-cols-2">
        <Panel title="Atendimentos de hoje">
          <ul className="divide-y divide-border text-[13px]">
            {today.data?.map((a) => {
              const st = APPT_STATUS[a.status] ?? { label: a.status, tone: "info" as const };
              return (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <span className="w-12 font-bold">{timeSP(a.starts_at)}</span>
                  <span className="flex-1">{a.patients?.full_name}<br /><span className="text-muted-foreground">{a.procedure} · {a.dentists?.name}</span></span>
                  <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  <Link to="/prontuarios/$patientId" params={{ patientId: a.patient_id }} search={{ appointment: a.id }}
                    className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground hover:bg-primary/90">
                    {a.status === "realizada" ? "Ver" : "Abrir atendimento"}
                  </Link>
                </li>
              );
            })}
            {today.data?.length === 0 && <li className="py-6 text-center text-muted-foreground">Nenhuma consulta hoje.</li>}
          </ul>
        </Panel>
        <Panel title="Buscar paciente">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome do paciente"
            className="mb-3 h-9 w-full rounded-md border border-input bg-card px-3 text-[13px]" />
          <ul className="divide-y divide-border text-[13px]">
            {patients.data?.map((p) => (
              <li key={p.id}>
                <Link to="/prontuarios/$patientId" params={{ patientId: p.id }} search={{}} className="flex justify-between py-2 hover:text-primary">
                  <span className="font-bold">{p.full_name}</span>
                  <span className="text-muted-foreground">{p.insurance ?? "Particular"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </main>
    </>
  );
}
