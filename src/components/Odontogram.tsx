import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONDITIONS, FACES, FILL, LOWER, UPPER, type Condition, type Face } from "@/lib/chart";
import { cn } from "@/lib/utils";

export type ToothRow = { tooth: number; face: string; condition: string };

function ToothSvg({ faces, whole }: { faces: Record<string, Condition>; whole?: Condition | undefined }) {
  const f = (k: Face) => (whole === "extrair" ? FILL.extrair : whole === "ausente" ? FILL.ausente : FILL[faces[k] ?? "higido"]);
  const stroke = "var(--foreground)";
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <polygon points="0,0 40,0 28,12 12,12" fill={f("V")} stroke={stroke} strokeWidth="1" />
      <polygon points="40,0 40,40 28,28 28,12" fill={f("D")} stroke={stroke} strokeWidth="1" />
      <polygon points="0,40 40,40 28,28 12,28" fill={f("L")} stroke={stroke} strokeWidth="1" />
      <polygon points="0,0 0,40 12,28 12,12" fill={f("M")} stroke={stroke} strokeWidth="1" />
      <rect x="12" y="12" width="16" height="16" fill={f("O")} stroke={stroke} strokeWidth="1" />
      {whole === "ausente" && <path d="M2 2 L38 38 M38 2 L2 38" stroke={stroke} strokeWidth="2.5" />}
    </svg>
  );
}

export function Odontogram({ rows, editable, onSet }: {
  rows: ToothRow[];
  editable: boolean;
  onSet: (tooth: number, face: string, condition: Condition) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const byTooth = (t: number) => {
    const faces: Record<string, Condition> = {};
    let whole: Condition | undefined;
    rows.filter((r) => r.tooth === t).forEach((r) => (r.face === "T" ? (whole = r.condition as Condition) : (faces[r.face] = r.condition as Condition)));
    return { faces, whole };
  };
  const renderRow = (teeth: number[], top: boolean) => (
    <div className="flex justify-center gap-1">
      {teeth.map((t, i) => {
        const s = byTooth(t);
        return (
          <button key={t} type="button" onClick={() => setOpen(t)}
            className={cn("flex flex-col items-center rounded p-0.5 hover:bg-muted", i === 8 && "ml-3")}>
            {top && <span className="text-[10px] font-bold text-muted-foreground">{t}</span>}
            <ToothSvg {...s} />
            {!top && <span className="text-[10px] font-bold text-muted-foreground">{t}</span>}
          </button>
        );
      })}
    </div>
  );
  const cur = open ? byTooth(open) : null;

  return (
    <div>
      <div className="space-y-2 overflow-x-auto">
        {renderRow(UPPER, true)}
        <div className="mx-auto h-px w-full bg-border" />
        {renderRow(LOWER, false)}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
        {CONDITIONS.map((c) => (
          <span key={c.key} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-foreground/40" style={{ background: FILL[c.key] }} />
            {c.label}
          </span>
        ))}
      </div>

      {open && cur && (
        <Dialog open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Dente {open}</DialogTitle></DialogHeader>
            {!editable && <p className="text-[12px] text-muted-foreground">Somente leitura — abra a partir de uma consulta para editar.</p>}
            <div className="space-y-3 text-[13px]">
              <div>
                <p className="mb-1 font-bold">Dente inteiro</p>
                <div className="flex flex-wrap gap-2">
                  {(["higido", "ausente", "extrair"] as Condition[]).map((c) => {
                    const active = c === "higido" ? !cur.whole : cur.whole === c;
                    return (
                      <CondButton key={c} c={c} active={active} disabled={!editable} onClick={() => onSet(open, "T", c)}
                        label={c === "higido" ? "Presente" : undefined} />
                    );
                  })}
                </div>
              </div>
              {!cur.whole && FACES.map((f) => (
                <div key={f.key}>
                  <p className="mb-1 font-bold">{f.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.filter((c) => !c.whole).map((c) => (
                      <CondButton key={c.key} c={c.key} disabled={!editable}
                        active={(cur.faces[f.key] ?? "higido") === c.key} onClick={() => onSet(open, f.key, c.key)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CondButton({ c, active, disabled, onClick, label }: { c: Condition; active: boolean; disabled: boolean; onClick: () => void; label?: string | undefined }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={cn("flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] disabled:opacity-60",
        active ? "border-primary bg-info-bg font-bold text-primary" : "border-input bg-card")}>
      <span className="inline-block h-3 w-3 rounded-sm border border-foreground/40" style={{ background: FILL[c] }} />
      {label ?? CONDITIONS.find((x) => x.key === c)?.label}
    </button>
  );
}
