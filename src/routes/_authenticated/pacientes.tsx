import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { fieldCls, labelCls } from "@/components/AuthCard";
import { formatCpfInput, formatPhoneInput, isValidCpf, maskCpf, onlyDigits } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — OdontoERP" },
      { name: "description", content: "Cadastro e busca de pacientes da clínica odontológica." },
    ],
  }),
  component: Pacientes,
});

type Patient = {
  id: string; full_name: string; cpf: string; birth_date: string | null; phone: string;
  email: string | null; insurance: string | null; clinical_notes: string | null; active: boolean;
};

const empty = { full_name: "", cpf: "", birth_date: "", phone: "", email: "", insurance: "", clinical_notes: "" };

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo").max(120),
  cpf: z.string().refine(isValidCpf, "CPF inválido"),
  birth_date: z.string().optional(),
  phone: z.string().refine((v) => onlyDigits(v).length >= 10, "Telefone inválido"),
  email: z.string().trim().max(255).refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido"),
  insurance: z.string().trim().max(80),
  clinical_notes: z.string().trim().max(2000),
});

function parseBr(d: string) {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function toBr(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function maskDate(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}

function Pacientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dup, setDup] = useState<{ id: string; full_name: string } | null>(null);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("full_name");
      if (error) throw error;
      return data as Patient[];
    },
  });

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qd = onlyDigits(q);
    return patients.filter((p) => {
      if (filter === "ativos" && !p.active) return false;
      if (filter === "inativos" && p.active) return false;
      if (!q) return true;
      return p.full_name.toLowerCase().includes(q) || (qd && (p.cpf.includes(qd) || onlyDigits(p.phone).includes(qd)));
    });
  }, [patients, search, filter]);

  function openNew() {
    setEditing(null); setForm(empty); setErrors({}); setDup(null); setShowForm(true);
  }
  function openEdit(p: Patient) {
    setEditing(p); setDup(null); setErrors({}); setShowForm(true);
    setForm({
      full_name: p.full_name, cpf: formatCpfInput(p.cpf), birth_date: toBr(p.birth_date), phone: p.phone,
      email: p.email ?? "", insurance: p.insurance ?? "", clinical_notes: p.clinical_notes ?? "",
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      setDup(null);
      const parsed = schema.safeParse(form);
      const errs: Record<string, string> = {};
      if (!parsed.success) parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      const birth = form.birth_date ? parseBr(form.birth_date) : null;
      if (form.birth_date && !birth) errs.birth_date = "Use dd/mm/aaaa";
      setErrors(errs);
      if (Object.keys(errs).length) return null;

      const cpf = onlyDigits(form.cpf);
      if (!editing || editing.cpf !== cpf) {
        const { data: found } = await supabase.rpc("find_patient_by_cpf", { _cpf: cpf });
        if (found && found.length) {
          setDup({ id: found[0].id, full_name: found[0].full_name });
          return null;
        }
      }
      const payload = {
        full_name: form.full_name.trim(), cpf, birth_date: birth, phone: form.phone,
        email: form.email.trim() || null, insurance: form.insurance.trim() || null,
        clinical_notes: form.clinical_notes.trim() || null,
      };
      const { error } = editing
        ? await supabase.from("patients").update(payload).eq("id", editing.id)
        : await supabase.from("patients").insert(payload);
      if (error) throw error;
      return true;
    },
    onSuccess: (ok) => {
      if (!ok) return;
      toast.success(editing ? "Cadastro atualizado." : "Paciente cadastrado.");
      qc.invalidateQueries({ queryKey: ["patients"] });
      openNew();
    },
    onError: () => toast.error("Não foi possível salvar o paciente."),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Patient) => {
      const { error } = await supabase.from("patients").update({ active: !p.active }).eq("id", p.id);
      if (error) throw error;
      return !p.active;
    },
    onSuccess: (active) => {
      toast.success(active ? "Paciente reativado." : "Paciente inativado.");
      qc.invalidateQueries({ queryKey: ["patients"] });
      if (editing) setEditing({ ...editing, active });
    },
  });

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-[11px] font-semibold text-alert">{errors[k]}</p> : null);

  return (
    <>
      <PageHeader title="Pacientes" />
      <main className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <input className={`${fieldCls} !w-80`} placeholder="🔎 Buscar por nome, CPF ou telefone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={openNew} className="h-[35px] rounded-md bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary/90">
            + Novo paciente
          </button>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-[35px] rounded-md border border-primary bg-card px-3 text-[13px] font-bold text-primary">
            <option value="ativos">Filtrar: Ativos</option>
            <option value="inativos">Filtrar: Inativos</option>
            <option value="todos">Filtrar: Todos</option>
          </select>
        </div>

        <div className={`grid gap-4 ${showForm ? "lg:grid-cols-[1.45fr_1fr]" : ""}`}>
          <Panel className="min-h-[370px]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-border text-left text-muted-foreground">
                  <th className="px-1.5 py-2 font-bold">Nome</th>
                  <th className="px-1.5 py-2 font-bold">CPF</th>
                  <th className="px-1.5 py-2 font-bold">Telefone</th>
                  <th className="px-1.5 py-2 font-bold">Convênio</th>
                  <th className="px-1.5 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} onClick={() => openEdit(p)}
                    className={`cursor-pointer border-b border-border hover:bg-background ${editing?.id === p.id ? "bg-info-bg" : ""}`}>
                    <td className="px-1.5 py-2.5">{p.full_name}</td>
                    <td className="px-1.5 py-2.5">{maskCpf(p.cpf)}</td>
                    <td className="px-1.5 py-2.5">{p.phone}</td>
                    <td className="px-1.5 py-2.5">{p.insurance || "—"}</td>
                    <td className="px-1.5 py-2.5">
                      {p.active ? <StatusBadge tone="ok">Ativo</StatusBadge> : <StatusBadge tone="alert">Inativo</StatusBadge>}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum paciente encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </Panel>

          {showForm && (
            <Panel title={editing ? `Editar paciente` : "Novo paciente"}>
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className={labelCls}>Nome completo *</label>
                  <input className={fieldCls} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                  <Err k="full_name" />
                </div>
                <div>
                  <label className={labelCls}>CPF *</label>
                  <input className={fieldCls} placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set("cpf", formatCpfInput(e.target.value))} />
                  <Err k="cpf" />
                </div>
                <div>
                  <label className={labelCls}>Nascimento</label>
                  <input className={fieldCls} placeholder="dd/mm/aaaa" value={form.birth_date} onChange={(e) => set("birth_date", maskDate(e.target.value))} />
                  <Err k="birth_date" />
                </div>
                <div>
                  <label className={labelCls}>Telefone / WhatsApp *</label>
                  <input className={fieldCls} placeholder="(11) 9 …" value={form.phone} onChange={(e) => set("phone", formatPhoneInput(e.target.value))} />
                  <Err k="phone" />
                </div>
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input className={fieldCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
                  <Err k="email" />
                </div>
                <div>
                  <label className={labelCls}>Convênio</label>
                  <input className={fieldCls} placeholder="Particular" value={form.insurance} onChange={(e) => set("insurance", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Alergias / observações clínicas</label>
                  <textarea rows={3} className={`${fieldCls} h-auto py-2`} value={form.clinical_notes} onChange={(e) => set("clinical_notes", e.target.value)} />
                </div>

                {dup && (
                  <div className="col-span-2 rounded-md bg-warn-bg px-3 py-2 text-xs text-warn">
                    <strong>CPF já cadastrado</strong> para {dup.full_name}.{" "}
                    <button type="button" className="font-bold underline"
                      onClick={() => { const p = patients.find((x) => x.id === dup.id); if (p) { setFilter("todos"); openEdit(p); } }}>
                      Abrir cadastro existente
                    </button>
                  </div>
                )}

                <div className="col-span-2 flex flex-wrap gap-3 pt-1">
                  <button disabled={save.isPending} className="h-[35px] rounded-md bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    Salvar
                  </button>
                  <button type="button" onClick={() => (editing ? openNew() : setShowForm(false))}
                    className="h-[35px] rounded-md border border-primary bg-card px-4 text-[13px] font-bold text-primary">
                    Cancelar
                  </button>
                  {editing && (
                    <button type="button" onClick={() => toggleActive.mutate(editing)}
                      className={`ml-auto h-[35px] rounded-md px-4 text-[13px] font-bold ${editing.active ? "bg-alert-bg text-alert" : "bg-ok-bg text-ok"}`}>
                      {editing.active ? "Inativar" : "Reativar"}
                    </button>
                  )}
                </div>
              </form>
            </Panel>
          )}
        </div>
      </main>
    </>
  );
}
