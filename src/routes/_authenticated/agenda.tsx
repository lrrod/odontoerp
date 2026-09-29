import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — OdontoERP" }, { name: "description", content: "Agenda da clínica no OdontoERP." }] }),
  component: () => <ComingSoon title="Agenda" />,
});
