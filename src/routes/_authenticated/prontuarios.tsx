import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/prontuarios")({
  head: () => ({ meta: [{ title: "Prontuários — OdontoERP" }, { name: "description", content: "Prontuários da clínica no OdontoERP." }] }),
  component: () => <ComingSoon title="Prontuários" />,
});
