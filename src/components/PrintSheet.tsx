import { useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClinic() {
  return useQuery({
    queryKey: ["clinic"],
    queryFn: async () => (await supabase.from("clinic_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
}

/** Full-screen printable sheet; styles.css hides everything else when printing. */
export function PrintSheet({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: c } = useClinic();
  return (
    <div className="print-area fixed inset-0 z-50 overflow-auto bg-muted">
      <div className="no-print sticky top-0 flex justify-center gap-2 border-b border-border bg-card p-3">
        <button className="rounded-md border border-border px-3 py-2 text-[13px] font-bold" onClick={() => router.history.back()}>Voltar</button>
        <button className="rounded-md bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
      </div>
      <div className="sheet mx-auto my-6 w-[794px] bg-card p-12 text-[13px] text-foreground shadow">
        <header className="mb-6 border-b-2 border-primary pb-3">
          <div className="text-xl font-bold text-primary">{c?.name}</div>
          <div className="text-xs text-muted-foreground">
            {c?.cnpj && <>CNPJ {c.cnpj} · </>}{c?.address}
            <br />{c?.phone}{c?.email && <> · {c.email}</>}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
