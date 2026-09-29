import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — OdontoERP" }, { name: "description", content: "Relatórios da clínica no OdontoERP." }] }),
  component: () => <ComingSoon title="Relatórios" />,
});
