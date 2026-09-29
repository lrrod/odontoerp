export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-[400px] rounded-xl bg-card px-9 py-9 shadow-lg">
        <div className="mb-7 text-center">
          <div className="text-[27px] font-bold text-sidebar">
            <span aria-hidden>🦷 </span>Odonto<span className="text-brand-teal">ERP</span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">Sistema de Gestão de Clínica Odontológica</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldCls =
  "h-[35px] w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
export const labelCls = "mb-1 block text-xs font-bold text-foreground/80";
