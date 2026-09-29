import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — OdontoERP" }, { name: "description", content: "Financeiro da clínica no OdontoERP." }] }),
  component: () => <ComingSoon title="Financeiro" />,
});
