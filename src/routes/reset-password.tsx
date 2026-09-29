import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, fieldCls, labelCls } from "@/components/AuthCard";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — OdontoERP" },
      { name: "description", content: "Defina uma nova senha de acesso ao OdontoERP." },
      { property: "og:title", content: "Redefinir senha — OdontoERP" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("A senha deve ter pelo menos 8 caracteres.");
    if (pw !== pw2) return setErr("As senhas não conferem.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr("Link inválido ou expirado. Solicite um novo em “Esqueci minha senha”.");
    navigate({ to: "/painel", replace: true });
  }

  return (
    <AuthCard>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className={labelCls} htmlFor="pw">Nova senha</label>
          <input id="pw" type="password" className={fieldCls} value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pw2">Confirmar nova senha</label>
          <input id="pw2" type="password" className={fieldCls} value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        {err && <p className="rounded-md bg-alert-bg px-3 py-2 text-xs font-semibold text-alert">{err}</p>}
        <button disabled={busy} className="h-[39px] w-full rounded-md bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          Salvar nova senha
        </button>
      </form>
    </AuthCard>
  );
}
