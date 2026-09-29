import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loginWithLock } from "@/lib/login.functions";
import { AuthCard, fieldCls, labelCls } from "@/components/AuthCard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — OdontoERP" },
      { name: "description", content: "Acesse o OdontoERP, sistema de gestão da clínica odontológica." },
      { property: "og:title", content: "Entrar — OdontoERP" },
      { property: "og:description", content: "Acesse o sistema de gestão da clínica." },
    ],
  }),
  component: LoginPage,
});

const TEST_LOGINS = [
  { name: "Roberto Lima — Administrador", email: "roberto.lima@odontoerp.com.br", password: "Gestao#Odonto26" },
  { name: "Ana Souza — Recepcionista", email: "ana.souza@odontoerp.com.br", password: "Recepcao@2026" },
  { name: "Dr. Carlos Prado — Dentista", email: "carlos.prado@odontoerp.com.br", password: "Dentista@2026" },
  { name: "Dra. Paula Nunes — Dentista", email: "paula.nunes@odontoerp.com.br", password: "Dentista@2026" },
];

function LoginPage() {
  const login = useServerFn(loginWithLock);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await login({ data: { email, password } });
      if (!r.ok) return setMsg({ kind: "error", text: r.error });
      await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      qc.clear();
      navigate({ to: "/painel", replace: true });
    } catch {
      setMsg({ kind: "error", text: "Não foi possível entrar. Verifique os dados e tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setMsg(
      error
        ? { kind: "error", text: "Não foi possível enviar o e-mail. Tente novamente." }
        : { kind: "ok", text: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." },
    );
  }

  return (
    <AuthCard>
      <form onSubmit={mode === "login" ? onLogin : onForgot} className="space-y-3.5">
        <div>
          <label className={labelCls} htmlFor="email">E-mail</label>
          <input id="email" type="email" required className={fieldCls} placeholder="usuario@clinica.com.br"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {mode === "login" && (
          <div>
            <label className={labelCls} htmlFor="password">Senha</label>
            <input id="password" type="password" required className={fieldCls} placeholder="••••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
        )}
        {msg && (
          <p className={`rounded-md px-3 py-2 text-xs font-semibold ${msg.kind === "error" ? "bg-alert-bg text-alert" : "bg-ok-bg text-ok"}`}>
            {msg.text}
          </p>
        )}
        <button disabled={busy} className="mt-1 h-[39px] w-full rounded-md bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Enviar link de redefinição"}
        </button>
        <div className="text-center">
          <button type="button" onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setMsg(null); }}
            className="text-xs text-primary underline">
            {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
          </button>
        </div>
      </form>
      {mode === "login" && (
        <div className="mt-7 border-t border-border pt-5">
          <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Logins de teste</p>
          <div className="space-y-1.5">
            {TEST_LOGINS.map((t) => (
              <button key={t.email} type="button"
                onClick={() => { setEmail(t.email); setPassword(t.password); setMsg(null); }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted/60"
                title="Clique para preencher o formulário">
                <span className="font-semibold text-foreground/90">{t.name}</span>
                <span className="text-muted-foreground">{t.email} · {t.password}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  );
}
