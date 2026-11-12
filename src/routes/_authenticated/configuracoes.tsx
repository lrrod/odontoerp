import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { WEEKDAYS, toMin } from "@/lib/schedule";
import { brl } from "@/lib/format";
import { UsersPanel } from "@/components/UsersPanel";
import { useServerFn } from "@tanstack/react-start";
import { listUsers } from "@/lib/users.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Building2, Stethoscope, Clock, ChevronRight } from "lucide-react";

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

type Section = "users" | "clinic" | "procedures" | "journey";

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
  const listUsersFn = useServerFn(listUsers);
  const users = useQuery({ queryKey: ["users-admin"], queryFn: () => listUsersFn() }).data;
  const clinic = useQuery({
    queryKey: ["clinic"],
    queryFn: async () => (await supabase.from("clinic_settings").select("*").eq("id", 1).maybeSingle()).data,
  }).data;
  const procs = useQuery({
    queryKey: ["procedures-admin"],
    queryFn: async () => (await supabase.from("procedures").select("*").order("code")).data ?? [],
  }).data;
  const [open, setOpen] = useState<Section | null>(null);
  const [dentistId, setDentistId] = useState<string>("");
  const dentist = data?.dentists.find((d) => d.id === dentistId) ?? data?.dentists[0];

  const cards: { key: Section; title: string; sub: string; Icon: typeof Users }[] = [
    { key: "users", title: "Usuários", sub: users ? `${users.filter((u) => u.active).length} usuários ativos` : "…", Icon: Users },
    { key: "clinic", title: "Dados da clínica", sub: clinic?.name ?? "…", Icon: Building2 },
    { key: "procedures", title: "Procedimentos", sub: procs ? `${procs.filter((p) => p.active).length} procedimentos ativos` : "…", Icon: Stethoscope },
    { key: "journey", title: "Jornada dos dentistas", sub: data ? `${data.dentists.length} dentistas` : "…", Icon: Clock },
  ];
  const titles: Record<Section, string> = { users: "Usuários", clinic: "Dados da clínica", procedures: "Procedimentos", journey: "Jornada de trabalho dos dentistas" };

  return (
    <>
      <PageHeader title="Configurações" />
      <main className="grid gap-4 p-6 md:grid-cols-2">
        {cards.map(({ key, title, sub, Icon }) => (
          <button key={key} onClick={() => setOpen(key)}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-7 w-7" /></span>
            <span className="flex-1">
              <span className="block text-[16px] font-bold">{title}</span>
              <span className="block text-[13px] text-muted-foreground">{sub}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </main>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{open ? titles[open] : ""}</DialogTitle></DialogHeader>
          {open === "users" && <UsersPanel bare />}
          {open === "clinic" && <ClinicPanel bare />}
          {open === "procedures" && <ProceduresPanel bare />}
          {open === "journey" && (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">A Agenda só oferece horários dentro desta jornada.</p>
              <select aria-label="Dentista" className="h-8 rounded-md border border-input bg-card px-2 text-[13px]"
                value={dentist?.id ?? ""} onChange={(e) => setDentistId(e.target.value)}>
                {data?.dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {dentist && data && (
                <DentistJourney key={dentist.id} bare dentist={dentist} schedules={data.schedules.filter((s) => s.dentist_id === dentist.id)} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Frame({ bare, title, children }: { bare?: boolean; title: string; children: React.ReactNode }) {
  return bare ? <div>{children}</div> : <Panel title={title}>{children}</Panel>;
}

function DentistJourney({ dentist, schedules, bare }: {
  bare?: boolean;
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
    <Frame bare={bare} title={dentist.name}>
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
    </Frame>
  );
}

function ProceduresPanel({ bare }: { bare?: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["procedures-admin"],
    queryFn: async () => (await supabase.from("procedures").select("*").order("code")).data ?? [],
  });
  const [form, setForm] = useState<{ id?: string; code: string; name: string; price: string }>({ code: "", name: "", price: "" });
  const save = useMutation({
    mutationFn: async (row: { id?: string | undefined; code: string; name: string; price: number; active?: boolean }) => {
      const { id, ...rest } = row;
      const { error } = id
        ? await supabase.from("procedures").update(rest).eq("id", id)
        : await supabase.from("procedures").insert(rest);
      if (error) throw new Error(error.code === "23505" ? "Já existe um procedimento com esse código" : error.message);
    },
    onSuccess: () => { toast.success("Procedimento salvo"); setForm({ code: "", name: "", price: "" }); qc.invalidateQueries({ queryKey: ["procedures-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const input = "h-8 rounded-md border border-input bg-card px-2 text-[13px]";
  const price = Number(form.price.replace(",", "."));
  const valid = form.code.trim() && form.name.trim() && form.price !== "" && price >= 0;
  return (
    <Frame bare={bare} title="Procedimentos">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b-2 border-border text-left text-muted-foreground"><th className="py-2">Código</th><th>Nome</th><th>Valor</th><th>Situação</th><th /></tr>
        </thead>
        <tbody>
          {data?.map((p) => (
            <tr key={p.id} className={`border-b border-border ${p.active ? "" : "opacity-50"}`}>
              <td className="py-1.5 font-bold">{p.code}</td><td>{p.name}</td><td>{brl(Number(p.price))}</td>
              <td>{p.active ? "Ativo" : "Inativo"}</td>
              <td className="space-x-3 text-right">
                <button className="text-primary hover:underline" onClick={() => setForm({ id: p.id, code: p.code, name: p.name, price: String(p.price) })}>Editar</button>
                <button className="text-primary hover:underline" onClick={() => save.mutate({ id: p.id, code: p.code, name: p.name, price: Number(p.price), active: !p.active })}>
                  {p.active ? "Desativar" : "Reativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className={`${input} w-24`} placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className={`${input} flex-1`} placeholder="Nome do procedimento" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={`${input} w-28`} placeholder="Valor (R$)" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        {form.id && <button className="text-[13px] text-muted-foreground" onClick={() => setForm({ code: "", name: "", price: "" })}>Cancelar</button>}
        <button disabled={!valid || save.isPending}
          onClick={() => save.mutate({ id: form.id, code: form.code.trim(), name: form.name.trim(), price })}
          className="h-8 rounded-md bg-primary px-4 text-[13px] font-bold text-primary-foreground disabled:opacity-50">
          {form.id ? "Salvar alteração" : "Adicionar"}
        </button>
      </div>
    </Frame>
  );
}

function ClinicPanel({ bare }: { bare?: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["clinic"],
    queryFn: async () => (await supabase.from("clinic_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [f, setF] = useState({ name: "", cnpj: "", address: "", phone: "", email: "" });
  useEffect(() => {
    if (data) setF({ name: data.name, cnpj: data.cnpj ?? "", address: data.address ?? "", phone: data.phone ?? "", email: data.email ?? "" });
  }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinic_settings").upsert({ id: 1, ...f, name: f.name.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Dados da clínica salvos"); qc.invalidateQueries({ queryKey: ["clinic"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const input = "h-8 w-full rounded-md border border-input bg-card px-2 text-[13px]";
  const fields: [keyof typeof f, string][] = [["name", "Nome da clínica"], ["cnpj", "CNPJ"], ["address", "Endereço"], ["phone", "Telefone"], ["email", "E-mail"]];
  return (
    <Frame bare={bare} title="Dados da clínica (usados no orçamento em PDF e nos recibos)">
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([k, l]) => (
          <label key={k} className={`text-xs font-bold text-foreground/80 ${k === "address" ? "col-span-2" : ""}`}>
            {l}
            <input className={input} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button disabled={!f.name.trim() || save.isPending} onClick={() => save.mutate()}
          className="h-8 rounded-md bg-primary px-4 text-[13px] font-bold text-primary-foreground disabled:opacity-50">Salvar</button>
      </div>
    </Frame>
  );
}
