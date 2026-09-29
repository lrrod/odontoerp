import { createContext, useContext, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, ROLE_LABEL } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

const NavCtx = createContext<() => void>(() => {});

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = MODULES.filter((m) => user?.role && (m.roles as readonly string[]).includes(user.role));
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <NavCtx.Provider value={() => setOpen((o) => !o)}>
      <div className="flex min-h-screen w-full bg-background">
        {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[210px] bg-sidebar text-sidebar-foreground transition-transform lg:z-20 lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-[59px] items-center gap-2 border-b border-sidebar-foreground/15 px-5 text-xl font-bold text-primary-foreground">
            <span aria-hidden>🦷</span>
            <span>
              Odonto<span className="text-brand-mint">ERP</span>
            </span>
          </div>
          <nav className="mt-2.5">
            {items.map((m) => {
              const active = path === m.to || path.startsWith(m.to + "/");
              return (
                <Link
                  key={m.key}
                  to={m.to}
                  className={cn(
                    "block border-l-4 px-4 py-2.5 text-sm transition-colors",
                    active
                      ? "border-brand-mint bg-sidebar-active text-primary-foreground"
                      : "border-transparent hover:bg-sidebar-active/50",
                  )}
                >
                  {m.title}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[210px]">{children}</div>
      </div>
    </NavCtx.Provider>
  );
}

export function PageHeader({ title }: { title: string }) {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toggleNav = useContext(NavCtx);
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  return (
    <header className="flex h-[54px] items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={toggleNav} className="rounded px-2 py-1 text-xl text-foreground hover:bg-muted lg:hidden" aria-label="Abrir menu">
          ☰
        </button>
        <h1 className="truncate text-[17px] font-bold text-foreground">{title}</h1>
      </div>
      <div className="shrink-0 text-[13px] text-muted-foreground">
        <span className="font-bold text-primary">{user?.name}</span>
        {user?.role && <> — {ROLE_LABEL[user.role]}</>}
        <span className="mx-2">·</span>
        <button onClick={signOut} className="hover:text-foreground hover:underline">
          Sair
        </button>
      </div>
    </header>
  );
}

export function Panel({ title, className, children }: { title?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-4", className)}>
      {title && <h2 className="mb-3 text-[15px] font-bold text-foreground">{title}</h2>}
      {children}
    </section>
  );
}
