export const money = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export const todaySP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export const dateBr = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const total = m - 1 + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const dim = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, dim)).padStart(2, "0")}`;
}

/** Mirrors approve_quote: equal parcels rounded down to cents; leftover cents go to parcel 1. */
export function splitInstallments(total: number, n: number, firstDue: string) {
  const base = Math.floor((total / n) * 100) / 100;
  const first = Math.round((total - base * (n - 1)) * 100) / 100;
  return Array.from({ length: n }, (_, i) => ({ no: i + 1, due: addMonths(firstDue, i), amount: i === 0 ? first : base }));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "debito", label: "Cartão de débito" },
  { value: "pix", label: "Pix" },
] as const;
export const METHOD_LABEL: Record<string, string> = Object.fromEntries(METHODS.map((m) => [m.value, m.label]));

export const QUOTE_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "alert" | "info" }> = {
  aguardando: { label: "Aguardando aprovação", tone: "warn" },
  aprovado: { label: "Aprovado", tone: "ok" },
  recusado: { label: "Recusado", tone: "alert" },
};

export function receivableStatus(r: { status: string; due_date: string; amount: number; paid_amount: number }, today = todaySP()) {
  if (r.status === "pago" || r.paid_amount >= r.amount - 0.001) return { key: "paga", label: "Paga", tone: "ok" as const };
  if (r.due_date < today) return { key: "vencida", label: "Vencida", tone: "alert" as const };
  return { key: "aberto", label: "Em aberto", tone: "info" as const };
}
