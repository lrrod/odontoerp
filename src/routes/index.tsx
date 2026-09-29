import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OdontoERP — Gestão de Clínica Odontológica" },
      { name: "description", content: "Sistema de gestão para clínicas odontológicas: pacientes, agenda, prontuários e financeiro." },
      { property: "og:title", content: "OdontoERP — Gestão de Clínica Odontológica" },
      { property: "og:description", content: "Sistema de gestão para clínicas odontológicas." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/painel" : "/login" });
  },
});
