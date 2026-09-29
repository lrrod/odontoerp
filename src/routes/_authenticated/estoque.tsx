import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — OdontoERP" }, { name: "description", content: "Estoque da clínica no OdontoERP." }] }),
  component: () => <ComingSoon title="Estoque" />,
});
