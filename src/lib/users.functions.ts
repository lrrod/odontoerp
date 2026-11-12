import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const role = z.enum(["admin", "dentista", "recepcionista"]);
type Ctx = { supabase: { rpc: (...a: any[]) => any }; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Apenas o Administrador pode gerenciar usuários.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function syncDentist(admin: any, userId: string, name: string, isDentist: boolean) {
  const { data: d } = await admin.from("dentists").select("id").eq("user_id", userId).maybeSingle();
  if (isDentist) {
    if (d) await admin.from("dentists").update({ active: true }).eq("id", d.id);
    else {
      const { error } = await admin.from("dentists").insert({ user_id: userId, name, active: true });
      if (error) throw new Error(error.message);
    }
  } else if (d) await admin.from("dentists").update({ active: false }).eq("id", d.id);
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context as Ctx);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("id, full_name, email, active").order("full_name"),
      admin.from("user_roles").select("user_id, role"),
    ]);
    const order = ["admin", "recepcionista", "dentista"];
    return (profs ?? []).map((p) => ({
      ...p,
      role: (order.find((r) => roles?.some((x) => x.user_id === p.id && x.role === r)) ?? null) as z.infer<typeof role> | null,
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    full_name: z.string().trim().min(3).max(120),
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8).max(72),
    role,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as Ctx);
    const { data: dup } = await admin.from("profiles").select("id").ilike("email", data.email).maybeSingle();
    if (dup) return { ok: false as const, error: "Já existe um usuário com este e-mail." };
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      console.error("[createUser]", error?.message);
      const dupe = /already|registered|exists/i.test(error?.message ?? "");
      return { ok: false as const, error: dupe ? "Já existe um usuário com este e-mail." : "Não foi possível criar o usuário." };
    }
    const id = created.user.id;
    try {
      const p = await admin.from("profiles").upsert({ id, full_name: data.full_name, email: data.email, active: true });
      if (p.error) throw new Error(p.error.message);
      const r = await admin.from("user_roles").insert({ user_id: id, role: data.role });
      if (r.error) throw new Error(r.error.message);
      if (data.role === "dentista") await syncDentist(admin, id, data.full_name, true);
    } catch (e) {
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
      return { ok: false as const, error: "Não foi possível criar o usuário: " + (e as Error).message };
    }
    return { ok: true as const };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), role }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as Ctx);
    if (data.user_id === context.userId) return { ok: false as const, error: "Você não pode alterar o seu próprio perfil." };
    const { data: prof } = await admin.from("profiles").select("full_name, active").eq("id", data.user_id).maybeSingle();
    if (!prof) return { ok: false as const, error: "Usuário não encontrado." };
    const del = await admin.from("user_roles").delete().eq("user_id", data.user_id);
    if (del.error) return { ok: false as const, error: del.error.message };
    const ins = await admin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (ins.error) return { ok: false as const, error: ins.error.message };
    await syncDentist(admin, data.user_id, prof.full_name, data.role === "dentista" && prof.active);
    return { ok: true as const };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as Ctx);
    if (data.user_id === context.userId) return { ok: false as const, error: "Você não pode desativar a sua própria conta." };
    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle();
    if (!prof) return { ok: false as const, error: "Usuário não encontrado." };
    const ban = await admin.auth.admin.updateUserById(data.user_id, { ban_duration: data.active ? "none" : "876000h" });
    if (ban.error) return { ok: false as const, error: ban.error.message };
    await admin.from("profiles").update({ active: data.active }).eq("id", data.user_id);
    const { data: isDent } = await admin.from("user_roles").select("id").eq("user_id", data.user_id).eq("role", "dentista").maybeSingle();
    if (isDent) await syncDentist(admin, data.user_id, prof.full_name, data.active);
    return { ok: true as const };
  });
