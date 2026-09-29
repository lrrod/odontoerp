import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

export const loginWithLock = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const { data: row } = await supabaseAdmin
      .from("login_attempts")
      .select("failed_count, locked_until")
      .eq("email", data.email)
      .maybeSingle();

    if (row?.locked_until && new Date(row.locked_until) > now) {
      const mins = Math.ceil((new Date(row.locked_until).getTime() - now.getTime()) / 60000);
      return { ok: false as const, error: `Acesso bloqueado temporariamente. Tente novamente em ${mins} min.` };
    }

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: auth, error } = await client.auth.signInWithPassword({ email: data.email, password: data.password });

    if (error || !auth.session) {
      const expired = row?.locked_until && new Date(row.locked_until) <= now;
      const count = (expired ? 0 : row?.failed_count ?? 0) + 1;
      const locked = count >= MAX_ATTEMPTS;
      await supabaseAdmin.from("login_attempts").upsert({
        email: data.email,
        failed_count: locked ? 0 : count,
        locked_until: locked ? new Date(now.getTime() + LOCK_MINUTES * 60000).toISOString() : null,
        updated_at: now.toISOString(),
      });
      if (locked) return { ok: false as const, error: `3 tentativas incorretas. Acesso bloqueado por ${LOCK_MINUTES} minutos.` };
      return { ok: false as const, error: `E-mail ou senha incorretos. Restam ${MAX_ATTEMPTS - count} tentativa(s).` };
    }

    await supabaseAdmin.from("login_attempts").delete().eq("email", data.email);
    return {
      ok: true as const,
      access_token: auth.session.access_token,
      refresh_token: auth.session.refresh_token,
    };
  });
