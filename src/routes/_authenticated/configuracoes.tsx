import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { WEEKDAYS, toMin } from "@/lib/schedule";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — OdontoERP" },
      { name: "description", content: "Configurações da clínica e jornada de trabalho dos dentistas no OdontoERP." },
    ],
  }),
  component: Configuracoes,
});

type Row = { active: boolean; start: string; end: string; lunchStart: string; lunchEnd: string; slot: number };
const DEFAULT: Row = { active: false, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:30", slot: 40 };
const t = (v: string | null) => (v ? v.slice(0, 5) : "");

function Configuracoes() {
  const { data } = useQuery({
    queryKey: ["config-schedules"],
    queryFn: async () => {
      const [d, s] = await Promise.all([
        supabase.from("dentists").select("id, name").eq("active", true).order("name"),
        supabase.from("dentist_schedules").select("*"),
      ]);
      return { dentists: d.data ?? [], schedules: s.data ?? [] };
    },
  });
  return (
    <>
      <PageHeader title="Configurações" />
      <main className="space-y-4 p-6">
        <h2 className="text-[15px] font-bold">Jornada de trabalho dos dentistas</h2>
        <p className="text-[13px] text-muted-foreground">A Agenda só oferece horários dentro desta jornada.</p>
        {data?.dentists.map((d) => (
          <DentistJourney key={d.id} dentist={d} schedules={data.schedules.filter((s) => s.dentist_id === d.id)} />
        ))}
      </main>
    </>
  );
}

function DentistJourney({ dentist, schedules }: {
  dentist: { id: string; name: string };
  schedules: { weekday: number; start_time: string; end_time: string; lunch_start: string | null; lunch_end: string | null; slot_minutes: number }[];
}) {
  const qc = useQueryClient();
  const build = () => WEEKDAYS.map((_, wd) => {
    const s = schedules.find((x) => x.weekday === wd);
    return s ? { active: true, start: t(s.start_time), end: t(s.end_time), lunchStart: t(s.lunch_start), lunchEnd: t(s.lunch_end), slot: s.slot_minutes } : { ...DEFAULT };
  });
  const [rows, setRows] = useState<Row[]>(build);
  useEffect(() => setRows(build()), [schedules]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const invalid = rows.some((r) => r.active && (toMin(r.end) <= toMin(r.start) ||
    (r.lunchStart && r.lunchEnd && (toMin(r.lunchEnd) <= toMin(r.lunchStart) || toMin(r.lunchStart) < toMin(r.start) || toMin(r.lunchEnd) > toMin(r.end))) ||
    (!!r.lunchStart !== !!r.lunchEnd)));

  const save = useMutation({
    mutationFn: async () => {
      const del = await supabase.from("dentist_schedules").delete().eq("dentist_id", dentist.id);
      if (del.error) throw del.error;
      const ins = rows.map((r, wd) => ({ r, wd })).filter(({ r }) => r.active).map(({ r, wd }) => ({
        dentist_id: dentist.id, weekday: wd, start_time: r.start, end_time: r.end,
        lunch_start: r.lunchStart || null, lunch_end: r.lunchEnd || null, slot_minutes: r.slot,
      }));
      if (ins.length) {
        const { error } = await supabase.from("dentist_schedules").insert(ins);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Jornada de ${dentist.name} salva`);
      qc.invalidateQueries({ queryKey: ["config-schedules"] });
      qc.invalidateQueries({ queryKey: ["agenda-base"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const input = "h-8 rounded-md border border-input bg-card px-2 text-[13px] disabled:opacity-40";
  return (
    <Panel title={dentist.name}>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b-2 border-border text-left text-muted-foreground">
            <th className="py-2">Dia</th><th>Início</th><th>Fim</th><th>Almoço início</th><th>Almoço fim</th><th>Slot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border">
              <td className="py-1.5">
                <label className="flex items-center gap-2 font-bold">
                  <input type="checkbox" checked={r.active} onChange={(e) => set(i, { active: e.target.checked })} />
                  {WEEKDAYS[i]}
                </label>
              </td>
              <td><input type="time" disabled={!r.active} className={input} value={r.start} onChange={(e) => set(i, { start: e.target.value })} /></td>
              <td><input type="time" disabled={!r.active} className={input} value={r.end} onChange={(e) => set(i, { end: e.target.value })} /></td>
              <td><input type="time" disabled={!r.active} className={input} value={r.lunchStart} onChange={(e) => set(i, { lunchStart: e.target.value })} /></td>
              <td><input type="time" disabled={!r.active} className={input} value={r.lunchEnd} onChange={(e) => set(i, { lunchEnd: e.target.value })} /></td>
              <td>
                <select disabled={!r.active} className={input} value={r.slot} onChange={(e) => set(i, { slot: Number(e.target.value) })}>
                  {[20, 30, 40, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-end gap-3">
        {invalid && <span className="text-[12px] text-alert">Verifique os horários (fim após início, almoço dentro da jornada).</span>}
        <button disabled={invalid || save.isPending} onClick={() => save.mutate()}
          className="h-[35px] rounded-md bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {save.isPending ? "Salvando…" : "Salvar jornada"}
        </button>
      </div>
    </Panel>
  );
}
