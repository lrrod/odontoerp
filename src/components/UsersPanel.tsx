import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { createUser, listUsers, setUserActive, updateUserRole } from "@/lib/users.functions";
import { ROLE_LABEL, type AppRole } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/current-user";

const ROLES: AppRole[] = ["admin", "dentista", "recepcionista"];
const input = "h-8 rounded-md border border-input bg-card px-2 text-[13px] disabled:opacity-50";
const EMPTY = { full_name: "", email: "", password: "", role: "recepcionista" as AppRole };

export function UsersPanel({ bare }: { bare?: boolean } = {}) {
  const qc = useQueryClient();
  const me = useCurrentUser().data;
  const list = useServerFn(listUsers), create = useServerFn(createUser);
  const changeRole = useServerFn(updateUserRole), setActive = useServerFn(setUserActive);
  const { data } = useQuery({ queryKey: ["users-admin"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["users-admin"] });
    qc.invalidateQueries({ queryKey: ["config-schedules"] });
    qc.invalidateQueries({ queryKey: ["agenda-base"] });
  };
  const run = useMutation({
    mutationFn: async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
      const r = await fn();
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => { toast.success("Usuário atualizado"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const valid = f.full_name.trim().length >= 3 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 8;

  return (
    <Wrap bare={bare}>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setOpen(!open)} className="h-8 rounded-md bg-primary px-4 text-[13px] font-bold text-primary-foreground">+ Novo usuário</button>
      </div>
      {open && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-md border border-border p-3">
          <label className="text-xs font-bold">Nome completo*<input className={`${input} w-full`} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
          <label className="text-xs font-bold">E-mail*<input type="email" className={`${input} w-full`} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label className="text-xs font-bold">Senha provisória* (mín. 8)<input type="text" className={`${input} w-full`} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
          <label className="text-xs font-bold">Perfil*
            <select className={`${input} w-full`} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as AppRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <div className="col-span-2 flex justify-end gap-2">
            <button className="text-[13px] text-muted-foreground" onClick={() => { setOpen(false); setF(EMPTY); }}>Cancelar</button>
            <button disabled={!valid || run.isPending}
              onClick={() => run.mutate(() => create({ data: f }), { onSuccess: () => { setOpen(false); setF(EMPTY); } })}
              className="h-8 rounded-md bg-primary px-4 text-[13px] font-bold text-primary-foreground disabled:opacity-50">Criar usuário</button>
          </div>
        </div>
      )}
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b-2 border-border text-left text-muted-foreground"><th className="py-2">Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th /></tr>
        </thead>
        <tbody>
          {data?.map((u) => {
            const self = u.id === me?.id;
            return (
              <tr key={u.id} className="border-b border-border">
                <td className="py-1.5 font-bold">{u.full_name}{self && " (você)"}</td>
                <td>{u.email}</td>
                <td>
                  <select aria-label={`Perfil de ${u.full_name}`} disabled={self || run.isPending} className={input} value={u.role ?? ""}
                    onChange={(e) => { const role = e.target.value as AppRole; run.mutate(() => changeRole({ data: { user_id: u.id, role } })); }}>
                    {!u.role && <option value="">—</option>}
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </td>
                <td><StatusBadge tone={u.active ? "ok" : "alert"}>{u.active ? "Ativo" : "Inativo"}</StatusBadge></td>
                <td className="text-right">
                  {!self && (
                    <button className="text-primary hover:underline" disabled={run.isPending}
                      onClick={() => run.mutate(() => setActive({ data: { user_id: u.id, active: !u.active } }))}>
                      {u.active ? "Desativar" : "Reativar"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Wrap>
  );
}

function Wrap({ bare, children }: { bare?: boolean | undefined; children: React.ReactNode }) {
  return bare ? <div>{children}</div> : <Panel title="Usuários">{children}</Panel>;
}
