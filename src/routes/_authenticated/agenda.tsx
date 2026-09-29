import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { APPT_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import {
  type BusyAppt, type Schedule, DURATIONS, INACTIVE, PROCEDURES, addDays, conflictsAt, dayBounds, journeySlots,
  localDate, localHM, longDate, reminderText, shortDate, suggestSlots, toHM, toISO, toMin, todaySP, weekdayOf,
  whatsappPhone,
} from "@/lib/schedule";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — OdontoERP" },
      { name: "description", content: "Agenda diária por dentista, agendamentos, remarcações e lembretes de consulta." },
    ],
  }),
  component: Agenda,
});

type Appt = BusyAppt & {
  patient_id: string;
  procedure: string;
  cancel_reason: string | null;
  patients: { full_name: string; phone: string } | null;
  dentists: { name: string } | null;
};

const TONE_CELL: Record<string, string> = {
  info: "bg-info-bg text-info border-l-info",
  ok: "bg-ok-bg text-ok border-l-ok",
  warn: "bg-warn-bg text-warn border-l-warn",
  alert: "bg-alert-bg text-alert border-l-alert",
};
const btn = "h-[35px] rounded-md px-4 text-[13px] font-bold disabled:opacity-50";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnOutline = `${btn} border border-primary bg-card text-primary hover:bg-muted`;
const field = "h-[35px] w-full rounded-md border border-input bg-card px-2.5 text-[13px]";

function useAgendaBase() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ["agenda-base", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [d, s] = await Promise.all([
        supabase.from("dentists").select("id, name, user_id").eq("active", true).order("name"),
        supabase.from("dentist_schedules").select("*"),
      ]);
      let dentists = d.data ?? [];
      if (user?.role === "dentista") dentists = dentists.filter((x) => x.user_id === user.id);
      return { dentists, schedules: (s.data ?? []) as Schedule[] };
    },
  });
}

async function fetchAppts(from: string, to: string, dentistId?: string) {
  let q = supabase
    .from("appointments")
    .select("id, dentist_id, patient_id, starts_at, duration_minutes, status, procedure, cancel_reason, patients(full_name, phone), dentists(name)")
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at");
  if (dentistId) q = q.eq("dentist_id", dentistId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Appt[];
}

function Agenda() {
  const { data: user } = useCurrentUser();
  const staff = user?.role === "admin" || user?.role === "recepcionista";
  const [date, setDate] = useState(todaySP);
  const [form, setForm] = useState<FormState | null>(null);
  const [detail, setDetail] = useState<Appt | null>(null);
  const base = useAgendaBase();
  const dentists = base.data?.dentists ?? [];
  const schedules = base.data?.schedules ?? [];

  const day = useQuery({
    queryKey: ["appointments", "day", date],
    enabled: !!user,
    queryFn: () => { const b = dayBounds(date); return fetchAppts(b.start, b.end); },
  });
  const tomorrow = addDays(todaySP(), 1);
  const reminders = useQuery({
    queryKey: ["appointments", "day", tomorrow],
    enabled: !!user,
    queryFn: () => { const b = dayBounds(tomorrow); return fetchAppts(b.start, b.end); },
  });

  const wd = weekdayOf(date);
  const rows = useMemo(() => {
    const set = new Set<number>();
    for (const d of dentists) {
      const s = schedules.find((x) => x.dentist_id === d.id && x.weekday === wd);
      if (!s) continue;
      journeySlots(s, s.slot_minutes).forEach((m) => set.add(m));
      if (s.lunch_start) set.add(toMin(s.lunch_start));
    }
    return [...set].sort((a, b) => a - b);
  }, [dentists, schedules, wd]);

  const active = (day.data ?? []).filter((a) => !INACTIVE.includes(a.status));
  const cancelled = (day.data ?? []).filter((a) => INACTIVE.includes(a.status));

  function cell(dentistId: string, m: number, next: number) {
    const s = schedules.find((x) => x.dentist_id === dentistId && x.weekday === wd);
    const appt = active.find((a) => a.dentist_id === dentistId && toMin(localHM(a.starts_at)) >= m && toMin(localHM(a.starts_at)) < next);
    if (appt) {
      const st = APPT_STATUS[appt.status] ?? { label: appt.status, tone: "info" as const };
      return (
        <button onClick={() => setDetail(appt)}
          className={cn("w-full rounded border-l-4 px-2 py-1.5 text-left text-[12px] hover:opacity-80", TONE_CELL[st.tone])}>
          <div className="font-bold">{localHM(appt.starts_at)} · {appt.patients?.full_name ?? "Paciente"}</div>
          <div className="opacity-90">{appt.procedure} · {st.label}</div>
        </button>
      );
    }
    const covering = active.find((a) => {
      if (a.dentist_id !== dentistId) return false;
      const st = toMin(localHM(a.starts_at));
      return st < m && st + a.duration_minutes > m;
    });
    if (covering) {
      const st = APPT_STATUS[covering.status] ?? { tone: "info" as const };
      return <div className={cn("h-full min-h-[34px] rounded border-l-4 opacity-50", TONE_CELL[st.tone])} />;
    }
    if (!s) return <Unavailable />;
    if (s.lunch_start && s.lunch_end && m >= toMin(s.lunch_start) && m < toMin(s.lunch_end))
      return <div className="rounded bg-muted px-2 py-2 text-center text-[12px] italic text-muted-foreground">Intervalo de almoço</div>;
    const fits = journeySlots(s, s.slot_minutes).includes(m);
    if (!fits) return <Unavailable />;
    const past = date < todaySP() || (date === todaySP() && m <= toMin(localHM(new Date().toISOString())));
    return (
      <button disabled={!staff || past}
        onClick={() => setForm({ dentistId, date, time: toHM(m), duration: s.slot_minutes })}
        className="w-full rounded bg-muted/60 px-2 py-2 text-center text-[12px] text-muted-foreground enabled:hover:bg-accent disabled:cursor-default">
        livre
      </button>
    );
  }

  return (
    <>
      <PageHeader title="Agenda" />
      <main className="grid gap-4 p-6 xl:grid-cols-[1fr_320px]">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button className={btnOutline} onClick={() => setDate(addDays(date, -1))} aria-label="Dia anterior">◀</button>
              <button className={btnOutline} onClick={() => setDate(todaySP())}>Hoje</button>
              <button className={btnOutline} onClick={() => setDate(addDays(date, 1))} aria-label="Próximo dia">▶</button>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={cn(field, "w-auto")} />
              <span className="ml-2 text-[15px] font-bold text-foreground">{longDate(date)}</span>
            </div>
            {staff && <button className={btnPrimary} onClick={() => setForm({ date })}>+ Agendar consulta</button>}
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              {dentists.length ? "Nenhum dentista atende neste dia." : "Nenhum dentista disponível."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-[13px]">
                <thead>
                  <tr>
                    <th className="w-16 text-left text-muted-foreground">Hora</th>
                    {dentists.map((d) => (
                      <th key={d.id} className="rounded bg-primary px-2 py-2 text-center font-bold text-primary-foreground">{d.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m, i) => (
                    <tr key={m}>
                      <td className="align-top pt-2 font-bold text-muted-foreground">{toHM(m)}</td>
                      {dentists.map((d) => (
                        <td key={d.id} className="align-top">{cell(d.id, m, rows[i + 1] ?? 24 * 60)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
            {Object.entries(APPT_STATUS).map(([k, v]) => <StatusBadge key={k} tone={v.tone}>{v.label}</StatusBadge>)}
          </div>

          {cancelled.length > 0 && (
            <div className="mt-4 border-t border-border pt-3 text-[12px] text-muted-foreground">
              <div className="mb-1 font-bold">Canceladas / faltas do dia</div>
              {cancelled.map((a) => (
                <button key={a.id} onClick={() => setDetail(a)} className="block hover:underline">
                  {localHM(a.starts_at)} · {a.patients?.full_name} · {a.dentists?.name} — {APPT_STATUS[a.status]?.label}
                  {a.cancel_reason ? ` (${a.cancel_reason})` : ""}
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Lembretes de amanhã">
          <p className="mb-3 text-[12px] text-muted-foreground">{longDate(tomorrow)}</p>
          <ul className="space-y-3">
            {(reminders.data ?? []).filter((a) => !INACTIVE.includes(a.status)).map((a) => {
              const text = reminderText({ patient: a.patients?.full_name ?? "", date: tomorrow, time: localHM(a.starts_at), dentist: a.dentists?.name ?? "" });
              return (
                <li key={a.id} className="rounded-md border border-border p-3 text-[13px]">
                  <div className="font-bold">{localHM(a.starts_at)} · {a.patients?.full_name}</div>
                  <div className="mb-2 text-[12px] text-muted-foreground">{a.dentists?.name} · {a.procedure}</div>
                  <div className="flex gap-2">
                    <button className={cn(btnOutline, "h-8 px-3 text-[12px]")}
                      onClick={async () => { await navigator.clipboard.writeText(text); toast.success("Lembrete copiado"); }}>
                      Copiar lembrete
                    </button>
                    {a.patients?.phone && (
                      <a target="_blank" rel="noreferrer" className={cn(btnPrimary, "inline-flex h-8 items-center px-3 text-[12px]")}
                        href={`https://wa.me/${whatsappPhone(a.patients.phone)}?text=${encodeURIComponent(text)}`}>
                        Abrir WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
            {reminders.data && reminders.data.filter((a) => !INACTIVE.includes(a.status)).length === 0 && (
              <li className="py-4 text-center text-[13px] text-muted-foreground">Nenhuma consulta amanhã.</li>
            )}
          </ul>
        </Panel>
      </main>

      {form && (
        <AppointmentForm initial={form} dentists={dentists} schedules={schedules}
          onClose={() => setForm(null)} onSaved={(d) => { setForm(null); setDate(d); }} />
      )}
      {detail && (
        <AppointmentDetail appt={detail} staff={staff} onClose={() => setDetail(null)}
          onReschedule={() => {
            setForm({ id: detail.id, patientId: detail.patient_id, patientName: detail.patients?.full_name ?? "", dentistId: detail.dentist_id,
              procedure: detail.procedure, date: localDate(detail.starts_at), time: localHM(detail.starts_at), duration: detail.duration_minutes });
            setDetail(null);
          }} />
      )}
    </>
  );
}

function Unavailable() {
  return <div className="h-full min-h-[34px] rounded bg-[repeating-linear-gradient(45deg,var(--color-muted),var(--color-muted)_4px,transparent_4px,transparent_8px)]" />;
}

type FormState = {
  id?: string; patientId?: string; patientName?: string; dentistId?: string; procedure?: string;
  date: string; time?: string; duration?: number;
};

function AppointmentForm({ initial, dentists, schedules, onClose, onSaved }: {
  initial: FormState; dentists: { id: string; name: string }[]; schedules: Schedule[];
  onClose: () => void; onSaved: (date: string) => void;
}) {
  const qc = useQueryClient();
  const [patient, setPatient] = useState<{ id: string; name: string } | null>(
    initial.patientId ? { id: initial.patientId, name: initial.patientName ?? "" } : null);
  const [search, setSearch] = useState("");
  const [dentistId, setDentistId] = useState(initial.dentistId ?? dentists[0]?.id ?? "");
  const [procedure, setProcedure] = useState<string>(initial.procedure ?? PROCEDURES[0] ?? "Avaliação");
  const [date, setDate] = useState(initial.date);
  const [duration, setDuration] = useState(initial.duration ?? 40);
  const [time, setTime] = useState(initial.time ?? "");

  const patients = useQuery({
    queryKey: ["patient-search", search],
    enabled: search.trim().length >= 2 && !patient,
    queryFn: async () => (await supabase.from("patients").select("id, full_name, cpf").eq("active", true)
      .ilike("full_name", `%${search.trim()}%`).order("full_name").limit(8)).data ?? [],
  });
  const busy = useQuery({
    queryKey: ["appointments", "dentist", dentistId, date],
    enabled: !!dentistId,
    queryFn: () => fetchAppts(toISO(date, "00:00"), toISO(addDays(date, 22), "00:00"), dentistId),
  });

  const dSchedules = schedules.filter((s) => s.dentist_id === dentistId);
  const daySchedule = dSchedules.find((s) => s.weekday === weekdayOf(date));
  const slots = journeySlots(daySchedule, duration);
  const timeMin = time ? toMin(time) : null;
  const inJourney = timeMin !== null && journeySlots(daySchedule, duration, 5).includes(timeMin);
  const conflicts = timeMin !== null && busy.data ? conflictsAt(date, timeMin, duration, busy.data, initial.id) : [];
  const hasConflict = conflicts.length > 0;
  const suggestions = hasConflict && timeMin !== null && busy.data
    ? suggestSlots(date, timeMin, duration, dSchedules, busy.data, initial.id) : [];

  const save = useMutation({
    mutationFn: async () => {
      const row = { patient_id: patient!.id, dentist_id: dentistId, procedure, starts_at: toISO(date, time), duration_minutes: duration };
      const { error } = initial.id
        ? await supabase.from("appointments").update({ ...row, status: "agendada", cancel_reason: null, cancelled_at: null }).eq("id", initial.id)
        : await supabase.from("appointments").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(initial.id ? "Consulta remarcada" : "Consulta agendada");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onSaved(date);
    },
    onError: (e: Error) => toast.error(e.message.includes("Conflito") ? "Conflito de horário — escolha outro horário." : e.message),
  });

  const canSave = !!patient && !!dentistId && !!time && inJourney && !hasConflict && !busy.isLoading && !save.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial.id ? "Remarcar consulta" : "Agendar consulta"}</DialogTitle></DialogHeader>
        <form className="space-y-3 text-[13px]" onSubmit={(e) => { e.preventDefault(); if (canSave) save.mutate(); }}>
          <div className="block">
            <span className="mb-1 block font-bold">Paciente</span>
            {patient ? (
              <div className="flex items-center justify-between rounded-md border border-input px-2.5 py-2">
                <span>{patient.name}</span>
                {!initial.id && <button type="button" className="text-primary hover:underline" onClick={() => { setPatient(null); setSearch(""); }}>trocar</button>}
              </div>
            ) : (
              <div className="relative">
                <input autoFocus className={field} placeholder="Digite o nome do paciente…" value={search} onChange={(e) => setSearch(e.target.value)} />
                {(patients.data?.length ?? 0) > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow">
                    {patients.data!.map((p) => (
                      <li key={p.id}>
                        <button type="button" className="w-full px-2.5 py-2 text-left hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); setPatient({ id: p.id, name: p.full_name }); }}>
                          {p.full_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {search.trim().length >= 2 && patients.data?.length === 0 && (
                  <p className="mt-1 text-[12px] text-muted-foreground">Nenhum paciente encontrado.</p>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block font-bold">Dentista</span>
              <select className={field} value={dentistId} onChange={(e) => setDentistId(e.target.value)}>
                {dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block"><span className="mb-1 block font-bold">Procedimento</span>
              <select className={field} value={procedure} onChange={(e) => setProcedure(e.target.value)}>
                {[...new Set([procedure, ...PROCEDURES])].map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="block"><span className="mb-1 block font-bold">Data</span>
              <input type="date" min={todaySP()} className={field} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
            <label className="block"><span className="mb-1 block font-bold">Duração</span>
              <select className={field} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </label>
          </div>
          <label className="block"><span className="mb-1 block font-bold">Hora</span>
            <select className={cn(field, hasConflict && "border-2 border-alert bg-alert-bg text-alert")} value={time} onChange={(e) => setTime(e.target.value)}>
              <option value="">{daySchedule ? "Selecione…" : "Dentista não atende neste dia"}</option>
              {time && !slots.includes(toMin(time)) && <option value={time}>{time}</option>}
              {slots.map((m) => {
                const busyHere = busy.data ? conflictsAt(date, m, duration, busy.data, initial.id).length > 0 : false;
                return <option key={m} value={toHM(m)}>{toHM(m)}{busyHere ? " — ocupado" : ""}</option>;
              })}
            </select>
          </label>
          {time && !inJourney && !hasConflict && (
            <p className="rounded-md bg-warn-bg px-3 py-2 text-warn">Horário fora da jornada do dentista.</p>
          )}
          {hasConflict && (
            <div className="rounded-md border border-alert bg-alert-bg px-3 py-2 text-alert">
              <p className="font-bold">
                Conflito de horário: {conflicts.map((c) => `${localHM(c.starts_at)} ${c.patients?.full_name ?? ""}`).join(", ")}.
              </p>
              {suggestions.length > 0 ? (
                <>
                  <p className="mt-1">Horários livres mais próximos:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button key={s.date + s.min} type="button" className="rounded-md border border-ok bg-ok-bg px-3 py-1 font-bold text-ok hover:opacity-80"
                        onClick={() => { setDate(s.date); setTime(toHM(s.min)); }}>
                        {s.date === date ? "" : `${shortDate(s.date)} `}{toHM(s.min)}
                      </button>
                    ))}
                  </div>
                </>
              ) : <p className="mt-1">Nenhum horário livre encontrado nas próximas semanas.</p>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnOutline} onClick={onClose}>Cancelar</button>
            <button disabled={!canSave} className={btnPrimary}>{save.isPending ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentDetail({ appt, staff, onClose, onReschedule }: {
  appt: Appt; staff: boolean; onClose: () => void; onReschedule: () => void;
}) {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const canChart = me?.role === "admin" || me?.role === "dentista";
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const update = useMutation({
    mutationFn: async (patch: { status: string; cancel_reason?: string | null; cancelled_at?: string | null }) => {
      const { error } = await supabase.from("appointments").update(patch).eq("id", appt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consulta atualizada");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const st = APPT_STATUS[appt.status];
  const inactive = INACTIVE.includes(appt.status);
  const statuses = ["agendada", "confirmada", "em_atendimento", "realizada", "falta"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{appt.patients?.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-1 text-[13px]">
          <p><b>Data:</b> {shortDate(localDate(appt.starts_at))} às {localHM(appt.starts_at)} ({appt.duration_minutes} min)</p>
          <p><b>Dentista:</b> {appt.dentists?.name}</p>
          <p><b>Procedimento:</b> {appt.procedure}</p>
          <p><b>Status:</b> {st && <StatusBadge tone={st.tone}>{st.label}</StatusBadge>}</p>
          {appt.cancel_reason && <p><b>Motivo:</b> {appt.cancel_reason}</p>}
        </div>
        {canChart && !inactive && (
          <Link to="/prontuarios/$patientId" params={{ patientId: appt.patient_id }} search={{ appointment: appt.id }}
            className="block rounded-md bg-primary py-2 text-center text-[13px] font-bold text-primary-foreground hover:bg-primary/90">
            {appt.status === "realizada" ? "Ver prontuário" : "Abrir atendimento"}
          </Link>
        )}
        {!inactive && (
          <div>
            <p className="mb-2 text-[12px] font-bold text-muted-foreground">Alterar status</p>
            <div className="flex flex-wrap gap-2">
              {statuses.filter((s) => s !== appt.status).map((s) => (
                <button key={s} disabled={update.isPending} className={cn(btnOutline, "h-8 px-3 text-[12px]")}
                  onClick={() => update.mutate({ status: s })}>
                  {APPT_STATUS[s]?.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {staff && cancelling && (
          <div className="space-y-2">
            <textarea autoFocus className="w-full rounded-md border border-input p-2 text-[13px]" rows={2}
              placeholder="Motivo do cancelamento (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className={btnOutline} onClick={() => setCancelling(false)}>Voltar</button>
              <button disabled={!reason.trim() || update.isPending} className={cn(btn, "bg-alert text-primary-foreground")}
                onClick={() => update.mutate({ status: "cancelada", cancel_reason: reason.trim(), cancelled_at: new Date().toISOString() })}>
                Confirmar cancelamento
              </button>
            </div>
          </div>
        )}
        {staff && !cancelling && (
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button className={btnOutline} onClick={onReschedule}>Remarcar</button>
            {!inactive && <button className={cn(btn, "border border-alert text-alert hover:bg-alert-bg")} onClick={() => setCancelling(true)}>Cancelar consulta</button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
