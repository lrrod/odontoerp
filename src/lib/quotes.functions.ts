import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  quote: z.object({
    patient_id: z.string().uuid(),
    subtotal: z.number().min(0),
    discount_type: z.enum(["percent", "value"]),
    discount_value: z.number().min(0),
    discount_amount: z.number().min(0),
    total: z.number().min(0),
    installments: z.number().int().min(1).max(12),
    first_due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  items: z.array(z.object({
    step_id: z.string().uuid().nullable(),
    procedure_id: z.string().uuid().nullable(),
    description: z.string().min(1).max(300),
    teeth: z.array(z.number().int()),
    price: z.number().min(0),
    position: z.number().int(),
  })).min(1).max(100),
  admin: z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(1).max(200) }),
});

/** Creates a quote whose discount exceeds 15%, after verifying an Administrator's password server-side. */
export const createQuoteWithAdminAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isRecep }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "recepcionista" }),
    ]);
    if (!isAdmin && !isRecep) return { ok: false as const, error: "Sem permissão" };

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const temp = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (i, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(i, { ...init, headers: h });
        },
      },
    });
    const { data: auth, error } = await temp.auth.signInWithPassword(data.admin);
    if (error || !auth.user) return { ok: false as const, error: "E-mail ou senha do Administrador incorretos" };
    await temp.auth.signOut().catch(() => {});

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
    if (!role) return { ok: false as const, error: "Este usuário não é Administrador" };

    const { data: q, error: qe } = await supabaseAdmin
      .from("quotes")
      .insert({ ...data.quote, discount_approved_by: auth.user.id, created_by: context.userId })
      .select("id")
      .single();
    if (qe || !q) return { ok: false as const, error: qe?.message ?? "Erro ao gravar orçamento" };
    const { error: ie } = await supabaseAdmin.from("quote_items").insert(data.items.map((it) => ({ ...it, quote_id: q.id })));
    if (ie) {
      await supabaseAdmin.from("quotes").delete().eq("id", q.id);
      return { ok: false as const, error: ie.message };
    }
    return { ok: true as const, id: q.id };
  });
