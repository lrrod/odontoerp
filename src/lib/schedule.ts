import { onlyDigits } from "./format";

export type Schedule = {
  dentist_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  slot_minutes: number;
};
export type BusyAppt = { id: string; dentist_id: string; starts_at: string; duration_minutes: number; status: string };

export const TZ = "America/Sao_Paulo";
export const INACTIVE = ["cancelada", "falta"];
export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const PROCEDURES = [
  "Avaliação", "Limpeza (profilaxia)", "Restauração", "Canal (endodontia)", "Extração",
  "Clareamento", "Manutenção ortodôntica", "Prótese", "Implante", "Retorno",
];
export const DURATIONS = [20, 30, 40, 60, 80, 90, 120];

export const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
export const toHM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const todaySP = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const toISO = (date: string, hm: string) => new Date(`${date}T${hm}:00-03:00`).toISOString();
export const dayBounds = (date: string) => ({ start: toISO(date, "00:00"), end: toISO(addDays(date, 1), "00:00") });
export const localDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
export const localHM = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
export const longDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
export const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Start minutes of every slot inside the dentist's workday for the given duration. */
export function journeySlots(s: Schedule | undefined, duration: number, step?: number) {
  if (!s) return [];
  const out: number[] = [];
  const st = toMin(s.start_time), en = toMin(s.end_time);
  const ls = s.lunch_start ? toMin(s.lunch_start) : null, le = s.lunch_end ? toMin(s.lunch_end) : null;
  const inc = step ?? s.slot_minutes;
  let t = st;
  while (t + duration <= en) {
    if (ls !== null && le !== null && t < le && t + duration > ls) {
      t = Math.max(t + inc, le);
      continue;
    }
    out.push(t);
    t += inc;
  }
  return out;
}

export function overlaps(aStart: number, aDur: number, bStart: number, bDur: number) {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

export function conflictsAt<T extends BusyAppt>(date: string, startMin: number, duration: number, busy: T[], ignoreId?: string) {
  return busy.filter((a) => {
    if (a.id === ignoreId || INACTIVE.includes(a.status) || localDate(a.starts_at) !== date) return false;
    return overlaps(startMin, duration, toMin(localHM(a.starts_at)), a.duration_minutes);
  });
}

/** 3 nearest free slots — same day first (by distance to target), then following days. */
export function suggestSlots(
  date: string, targetMin: number, duration: number, schedules: Schedule[], busy: BusyAppt[], ignoreId?: string,
) {
  const out: { date: string; min: number }[] = [];
  const nowDate = todaySP();
  const nowMin = toMin(localHM(new Date().toISOString()));
  for (let i = 0; i < 21 && out.length < 3; i++) {
    const d = addDays(date, i);
    if (d < nowDate) continue;
    const s = schedules.find((x) => x.weekday === weekdayOf(d));
    let free = journeySlots(s, duration).filter(
      (m) => !(d === nowDate && m <= nowMin) && conflictsAt(d, m, duration, busy, ignoreId).length === 0,
    );
    if (i === 0) free = free.sort((a, b) => Math.abs(a - targetMin) - Math.abs(b - targetMin));
    for (const m of free) {
      if (out.length >= 3) break;
      out.push({ date: d, min: m });
    }
  }
  return out;
}

export function whatsappPhone(phone: string) {
  const d = onlyDigits(phone);
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

export function reminderText(p: { patient: string; date: string; time: string; dentist: string }) {
  const first = p.patient.split(" ")[0];
  return `Olá ${first}, lembramos sua consulta amanhã, ${shortDate(p.date)}, às ${p.time} com ${p.dentist}. Responda para confirmar. — OdontoERP`;
}
