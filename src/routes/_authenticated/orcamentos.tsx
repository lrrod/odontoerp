import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — OdontoERP" }, { name: "description", content: "Orçamentos da clínica no OdontoERP." }] }),
  component: () => <ComingSoon title="Orçamentos" />,
});
