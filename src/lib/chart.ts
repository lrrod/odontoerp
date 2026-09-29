export const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export type Condition = "higido" | "carie" | "restaurado" | "canal" | "ausente" | "extrair";
export type Face = "V" | "L" | "M" | "D" | "O";

export const CONDITIONS: { key: Condition; label: string; whole?: boolean }[] = [
  { key: "higido", label: "Hígido" },
  { key: "carie", label: "Cárie" },
  { key: "restaurado", label: "Restaurado" },
  { key: "canal", label: "Canal em tratamento" },
  { key: "ausente", label: "Ausente", whole: true },
  { key: "extrair", label: "A extrair", whole: true },
];

export const FACES: { key: Face; label: string }[] = [
  { key: "V", label: "Vestibular" },
  { key: "L", label: "Lingual / Palatina" },
  { key: "M", label: "Mesial" },
  { key: "D", label: "Distal" },
  { key: "O", label: "Oclusal / Incisal" },
];

export const FILL: Record<Condition, string> = {
  higido: "var(--tooth-higido)",
  carie: "var(--tooth-carie)",
  restaurado: "var(--tooth-restaurado)",
  canal: "var(--tooth-canal)",
  ausente: "var(--tooth-ausente)",
  extrair: "var(--tooth-extrair)",
};

export const STEP_STATUS: Record<string, { label: string; tone: "info" | "warn" | "ok" }> = {
  pendente: { label: "Pendente", tone: "info" },
  andamento: { label: "Em andamento", tone: "warn" },
  concluida: { label: "Concluída", tone: "ok" },
};

export const parseTeeth = (v: string) =>
  v.split(/[\s,;]+/).map(Number).filter((n) => [...UPPER, ...LOWER].includes(n));

export function ageFrom(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth + "T00:00:00");
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

export const dateTimeSP = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
