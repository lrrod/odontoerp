import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — OdontoERP" }, { name: "description", content: "Configurações da clínica no OdontoERP." }] }),
  component: () => <ComingSoon title="Configurações" />,
});
