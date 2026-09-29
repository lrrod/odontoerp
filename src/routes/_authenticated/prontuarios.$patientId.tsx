import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { APPT_STATUS, StatusBadge } from "@/components/StatusBadge";
import { Odontogram } from "@/components/Odontogram";
import { STEP_STATUS, ageFrom, dateTimeSP, parseTeeth, type Condition } from "@/lib/chart";
import { brl, timeSP } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/prontuarios/$patientId")({
  validateSearch: z.object({ appointment: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Prontuário do paciente — OdontoERP" },
      { name: "description", content: "Odontograma, plano de tratamento e evolução do atendimento." },
    ],
  }),
  component: Chart,
});

const btn = "h-[35px] rounded-md px-4 text-[13px] font-bold disabled:opacity-50";
const input = "h-8 rounded-md border border-input bg-card px-2 text-[13px]";

function Chart() {
  const { patientId } = Route.useParams();
  const { appointment: apptId } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ["chart", patientId];

  const { data, isLoading } = useQuery({
    queryKey: [...key, apptId],
    queryFn: async () => {
      const [p, teeth, steps, evos, procs, appt, draft] = await Promise.all([
        supabase.from("patients").select("id, full_name, birth_date, insurance, clinical_notes, phone").eq("id", patientId).maybeSingle(),
        supabase.from("tooth_conditions").select("tooth, face, condition").eq("patient_id", patientId),
        supabase.from("treatment_plan_steps").select("id, teeth, step_order, status, procedure_id, procedures(code, name, price)").eq("patient_id", patientId).order("step_order"),
        supabase.from("clinical_evolutions").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
        supabase.from("procedures").select("id, code, name, price").eq("active", true).order("code"),
        apptId ? supabase.from("appointments").select("id, status, starts_at, procedure, patient_id, dentists(name)").eq("id", apptId).maybeSingle() : Promise.resolve({ data: null }),
        apptId ? supabase.from("evolution_drafts").select("content, step_ids").eq("appointment_id", apptId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return {
        patient: p.data, teeth: teeth.data ?? [], steps: steps.data ?? [], evos: evos.data ?? [],
        procs: procs.data ?? [], appt: appt.data?.patient_id === patientId ? appt.data : null, draft: draft.data,
      };
    },
  });

  const appt = data?.appt;
  const editable = !!appt && !["realizada", "cancelada", "falta"].includes(appt.status);
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  // Opening the appointment moves it to "Em atendimento"
  const started = useRef(false);
  useEffect(() => {
    if (!appt || started.current || !["agendada", "confirmada"].includes(appt.status)) return;
    started.current = true;
    supabase.from("appointments").update({ status: "em_atendimento" }).eq("id", appt.id).then(({ error }) => {
      if (error) toast.error(error.message); else { refresh(); qc.invalidateQueries({ queryKey: ["appointments"] }); }
    });
  }, [appt]); // eslint-disable-line react-hooks/exhaustive-deps

  const [text, setText] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const loadedDraft = useRef(false);
  useEffect(() => {
    if (data && !loadedDraft.current) {
      loadedDraft.current = true;
      if (data.draft) { setText(data.draft.content); setDone(data.draft.step_ids ?? []); }
    }
  }, [data]);

  const setTooth = useMutation({
    mutationFn: async ({ tooth, face, condition }: { tooth: number; face: string; condition: Condition }) => {
      if (condition === "higido") {
        const { error } = await supabase.from("tooth_conditions").delete().match({ patient_id: patientId, tooth, face });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tooth_conditions")
          .upsert({ patient_id: patientId, tooth, face, condition, updated_at: new Date().toISOString() }, { onConflict: "patient_id,tooth,face" });
        if (error) throw error;
      }
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDraft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evolution_drafts")
        .upsert({ appointment_id: appt!.id, patient_id: patientId, content: text, step_ids: done });
      if (error) throw error;
      if (appt!.status !== "em_atendimento") {
        const u = await supabase.from("appointments").update({ status: "em_atendimento" }).eq("id", appt!.id);
        if (u.error) throw u.error;
      }
    },
    onSuccess: () => { toast.success("Rascunho salvo"); refresh(); qc.invalidateQueries({ queryKey: ["appointments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const finalize = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("finalize_appointment", { _appointment: appt!.id, _content: text, _step_ids: done });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atendimento finalizado");
      setText(""); setDone([]);
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <><PageHeader title="Prontuário" /><main className="p-6 text-muted-foreground">Carregando…</main></>;
  if (!data?.patient) return (
    <><PageHeader title="Prontuário" /><main className="p-6">Paciente não encontrado ou sem acesso. <Link to="/prontuarios" className="text-primary underline">Voltar</Link></main></>
  );
  const p = data.patient;
  const age = ageFrom(p.birth_date);
  const pending = data.steps.filter((s) => s.status !== "concluida");

  return (
    <>
      <PageHeader title="Prontuário" />
      <main className="grid gap-4 p-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-bold">{p.full_name}</h2>
                <p className="text-[13px] text-muted-foreground">
                  {age !== null && `${age} anos · `}{p.insurance ?? "Particular"} · {p.phone}
                </p>
                {p.clinical_notes && (
                  <p className="mt-2 rounded-md bg-alert-bg px-2 py-1 text-[12px] font-bold text-alert">⚠ {p.clinical_notes}</p>
                )}
              </div>
              {appt ? (
                <div className="text-right text-[13px]">
                  <p>Consulta {timeSP(appt.starts_at)} · {appt.procedure}</p>
                  <StatusBadge tone={APPT_STATUS[appt.status]?.tone ?? "info"}>{APPT_STATUS[appt.status]?.label ?? appt.status}</StatusBadge>
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">Somente leitura — para registrar, abra pela consulta do dia.</p>
              )}
            </div>
          </Panel>

          <Panel title="Odontograma">
            <Odontogram rows={data.teeth} editable={editable}
              onSet={(tooth, face, condition) => setTooth.mutate({ tooth, face, condition })} />
          </Panel>

          <TreatmentPlan patientId={patientId} steps={data.steps} procs={data.procs} editable={editable} onChange={refresh} />

          {editable && (
            <Panel title="Evolução do atendimento">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
                placeholder="Descreva o atendimento realizado…"
                className="w-full rounded-md border border-input bg-card p-2 text-[13px]" />
              {pending.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 text-[12px] font-bold text-muted-foreground">Procedimentos realizados neste atendimento (a etapa será concluída)</p>
                  <div className="flex flex-col gap-1 text-[13px]">
                    {pending.map((s) => (
                      <label key={s.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={done.includes(s.id)}
                          onChange={(e) => setDone((d) => (e.target.checked ? [...d, s.id] : d.filter((x) => x !== s.id)))} />
                        {s.step_order}. {s.procedures?.name}{s.teeth.length > 0 && ` — dente ${s.teeth.join(", ")}`}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-2 text-[12px] text-muted-foreground">Após finalizar, a evolução não pode mais ser alterada nem excluída.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button className={`${btn} border border-input bg-card`} disabled={saveDraft.isPending} onClick={() => saveDraft.mutate()}>
                  Salvar rascunho
                </button>
                <button className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}
                  disabled={finalize.isPending || !text.trim()}
                  onClick={() => { if (confirm("Finalizar o atendimento? A evolução ficará gravada definitivamente.")) finalize.mutate(); }}>
                  Finalizar atendimento
                </button>
              </div>
            </Panel>
          )}
          {appt && !editable && (
            <button className="text-[13px] text-primary underline" onClick={() => navigate({ to: "/prontuarios" })}>Voltar aos atendimentos</button>
          )}
        </div>

        <Panel title="Histórico" className="h-fit">
          <ol className="space-y-3">
            {data.evos.map((e) => (
              <li key={e.id} className="border-l-4 border-brand-teal pl-3 text-[13px]">
                <p className="text-[12px] text-muted-foreground">{dateTimeSP(e.created_at)} · <b>{e.author_name}</b></p>
                {e.procedures_done && <p className="font-bold text-primary">{e.procedures_done}</p>}
                <p className="whitespace-pre-wrap">{e.content}</p>
              </li>
            ))}
            {data.evos.length === 0 && <li className="text-[13px] text-muted-foreground">Nenhuma evolução registrada.</li>}
          </ol>
        </Panel>
      </main>
    </>
  );
}

type Step = { id: string; teeth: number[]; step_order: number; status: string; procedure_id: string; procedures: { code: string; name: string; price: number } | null };

function TreatmentPlan({ patientId, steps, procs, editable, onChange }: {
  patientId: string; steps: Step[]; procs: { id: string; code: string; name: string; price: number }[]; editable: boolean; onChange: () => void;
}) {
  const [proc, setProc] = useState("");
  const [teeth, setTeeth] = useState("");
  const run = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await fn();
      if (error) throw new Error(error.message);
    },
    onSuccess: onChange,
    onError: (e: Error) => toast.error(e.message),
  });
  const next = steps.reduce((m, s) => Math.max(m, s.step_order), 0) + 1;
  const swap = (i: number, j: number) => {
    const a = steps[i], b = steps[j];
    if (!a || !b) return;
    run.mutate(async () => {
      const r1 = await supabase.from("treatment_plan_steps").update({ step_order: b.step_order }).eq("id", a.id);
      if (r1.error) return r1;
      return supabase.from("treatment_plan_steps").update({ step_order: a.step_order }).eq("id", b.id);
    });
  };
  const total = steps.reduce((t, s) => t + Number(s.procedures?.price ?? 0), 0);

  return (
    <Panel title="Plano de tratamento">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b-2 border-border text-left text-muted-foreground">
            <th className="py-2">Ordem</th><th>Procedimento</th><th>Dente(s)</th><th>Valor</th><th>Status</th>{editable && <th />}
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={s.id} className="border-b border-border">
              <td className="py-1.5">{s.step_order}</td>
              <td>{s.procedures?.code} · {s.procedures?.name}</td>
              <td>{s.teeth.join(", ") || "—"}</td>
              <td>{brl(Number(s.procedures?.price ?? 0))}</td>
              <td>
                {editable && s.status !== "concluida" ? (
                  <select className={input} value={s.status}
                    onChange={(e) => run.mutate(() => supabase.from("treatment_plan_steps").update({ status: e.target.value }).eq("id", s.id))}>
                    {Object.entries(STEP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                ) : (
                  <StatusBadge tone={STEP_STATUS[s.status]?.tone ?? "info"}>{STEP_STATUS[s.status]?.label}</StatusBadge>
                )}
              </td>
              {editable && (
                <td className="whitespace-nowrap text-right">
                  <button className="px-1" disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label="Subir">▲</button>
                  <button className="px-1" disabled={i === steps.length - 1} onClick={() => swap(i, i + 1)} aria-label="Descer">▼</button>
                  {s.status !== "concluida" && (
                    <button className="px-1 text-alert" aria-label="Remover"
                      onClick={() => run.mutate(() => supabase.from("treatment_plan_steps").delete().eq("id", s.id))}>✕</button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {steps.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Nenhuma etapa no plano.</td></tr>}
        </tbody>
      </table>
      {steps.length > 0 && <p className="mt-2 text-right text-[13px] font-bold">Total do plano: {brl(total)}</p>}
      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select className={input} value={proc} onChange={(e) => setProc(e.target.value)}>
            <option value="">Procedimento…</option>
            {procs.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
          <input className={`${input} w-40`} placeholder="Dente(s): 16, 26" value={teeth} onChange={(e) => setTeeth(e.target.value)} />
          <button className={`${btn} h-8 bg-primary text-primary-foreground`} disabled={!proc || run.isPending}
            onClick={() => {
              run.mutate(() => supabase.from("treatment_plan_steps").insert({ patient_id: patientId, procedure_id: proc, teeth: parseTeeth(teeth), step_order: next }));
              setProc(""); setTeeth("");
            }}>
            Adicionar etapa
          </button>
        </div>
      )}
    </Panel>
  );
}
