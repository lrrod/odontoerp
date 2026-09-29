import { cn } from "@/lib/utils";

export type Tone = "ok" | "warn" | "alert" | "info";

const tones: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  alert: "bg-alert-bg text-alert",
  info: "bg-info-bg text-info",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

export const APPT_STATUS: Record<string, { label: string; tone: Tone }> = {
  agendada: { label: "Agendada", tone: "info" },
  confirmada: { label: "Confirmada", tone: "ok" },
  em_atendimento: { label: "Em atendimento", tone: "warn" },
  realizada: { label: "Realizada", tone: "ok" },
  falta: { label: "Falta", tone: "alert" },
  cancelada: { label: "Cancelada", tone: "alert" },
};
