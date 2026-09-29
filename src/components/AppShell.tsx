import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, ROLE_LABEL } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const items = MODULES.filter((m) => user?.role && (m.roles as readonly string[]).includes(user.role));

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 w-[210px] bg-sidebar text-sidebar-foreground">
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
      <div className="ml-[210px] flex min-h-screen flex-1 flex-col">{children}</div>
      <UserSlot hidden />
      {/* sign-out handled in PageHeader via context-free event */}
      <SignOutBridge onSignOut={signOut} name={user?.name} role={user?.role ? ROLE_LABEL[user.role] : ""} />
    </div>
  );
}

// Shares sign-out + user label with PageHeader without prop drilling
let bridge: { onSignOut: () => void; name?: string; role: string } = { onSignOut: () => {}, role: "" };
function SignOutBridge(props: typeof bridge) {
  bridge = props;
  return null;
}
function UserSlot(_: { hidden?: boolean }) {
  return null;
}

export function PageHeader({ title }: { title: string }) {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  void bridge;
  return (
    <header className="flex h-[54px] items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-[17px] font-bold text-foreground">{title}</h1>
      <div className="text-[13px] text-muted-foreground">
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
