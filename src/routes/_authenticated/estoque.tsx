import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/AppShell";
import { StatusBadge, type Tone } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — OdontoERP" },
      { name: "description", content: "Controle de estoque da clínica: itens, lotes, validade, entradas e saídas." },
    ],
  }),
  component: Estoque,
});

const CATEGORIES = ["Restaurador", "Descartável", "Medicamento", "Instrumental", "Escritório"] as const;
const KIND_LABEL: Record<string, { label: string; tone: Tone }> = {
  entrada: { label: "Entrada", tone: "ok" },
  saida: { label: "Saída", tone: "info" },
  descarte: { label: "Descarte", tone: "alert" },
};

type Item = { id: string; name: string; category: string | null; lot: string | null; expiry_date: string | null; balance: number; minimum: number };

const todaySP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const daysTo = (d: string) => Math.round((new Date(d + "T00:00:00").getTime() - new Date(todaySP() + "T00:00:00").getTime()) / 86400000);
const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const errMsg = (e: unknown) => (e as { message?: string })?.message ?? "Erro ao salvar.";

function situation(i: Item): { label: string; tone: Tone; row: string } {
  const days = i.expiry_date ? daysTo(i.expiry_date) : null;
  if (i.balance < i.minimum) return { label: "Repor", tone: "alert", row: "bg-alert-bg/60" };
  if (days !== null && days < 0 && i.balance > 0) return { label: "Vencido", tone: "alert", row: "bg-warn-bg/70" };
  if (days !== null && days < 60 && i.balance > 0) return { label: `Vence em ${days} dias`, tone: "warn", row: "bg-warn-bg/70" };
  return { label: "OK", tone: "ok", row: "" };
}

function Estoque() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [entry, setEntry] = useState<Item | null>(null);
  const [exit, setExit] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  const items = useQuery({
    queryKey: ["stock-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("id,name,category,lot,expiry_date,balance,minimum").order("name").order("expiry_date");
      if (error) throw error;
      return data as Item[];
    },
  });
  const moves = useQuery({
    queryKey: ["stock-moves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id,kind,quantity,lot,author_name,created_at,supplier,note,stock_items(name)")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["stock-items"] });
    qc.invalidateQueries({ queryKey: ["stock-moves"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const list = useMemo(
    () => (items.data ?? []).filter((i) => (!cat || i.category === cat) && i.name.toLowerCase().includes(search.toLowerCase())),
    [items.data, cat, search],
  );
  const toRestock = (items.data ?? []).filter((i) => i.balance < i.minimum).length;

  return (
    <>
      <PageHeader title="Estoque" />
      <main className="grid gap-4 p-6 xl:grid-cols-[1fr_340px]">
        <Panel>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input placeholder="Buscar item…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className={cn("ml-auto text-sm font-bold", toRestock ? "text-alert" : "text-muted-foreground")}>
              {toRestock} {toRestock === 1 ? "item" : "itens"} em reposição
            </span>
            <Button size="sm" onClick={() => setCreating(true)}>Novo item</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-border text-left text-muted-foreground">
                  {["Item", "Categoria", "Lote", "Validade", "Saldo", "Mínimo", "Situação", ""].map((h) => (
                    <th key={h} className="px-1.5 py-2 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const s = situation(i);
                  return (
                    <tr key={i.id} className={cn("border-b border-border", s.row)}>
                      <td className="px-1.5 py-2 font-bold">{i.name}</td>
                      <td className="px-1.5 py-2">{i.category ?? "—"}</td>
                      <td className="px-1.5 py-2">{i.lot ?? "—"}</td>
                      <td className="px-1.5 py-2">{fmtDate(i.expiry_date)}</td>
                      <td className={cn("px-1.5 py-2 font-bold", i.balance < i.minimum && "text-alert")}>{i.balance}</td>
                      <td className="px-1.5 py-2">{i.minimum}</td>
                      <td className="px-1.5 py-2"><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-right">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEntry(i)}>+ Entrada</Button>{" "}
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setExit(i)} disabled={i.balance === 0}>− Saída</Button>
                      </td>
                    </tr>
                  );
                })}
                {items.data && list.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Nenhum item encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Última movimentação">
          <ul className="text-[13px]">
            {(moves.data ?? []).map((m) => {
              const k = KIND_LABEL[m.kind] ?? { label: m.kind, tone: "info" as Tone };
              return (
                <li key={m.id} className="border-b border-border py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{m.stock_items?.name}</span>
                    <StatusBadge tone={k.tone}>{k.label} {m.kind === "entrada" ? "+" : "−"}{m.quantity}</StatusBadge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.lot && <>Lote {m.lot} · </>}
                    {m.author_name} · {new Date(m.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
                    {m.supplier && <> · {m.supplier}</>}
                    {m.note && <> · {m.note}</>}
                  </div>
                </li>
              );
            })}
            {moves.data?.length === 0 && <li className="py-4 text-muted-foreground">Nenhuma movimentação ainda.</li>}
          </ul>
        </Panel>
      </main>

      {creating && <NewItemDialog onClose={() => setCreating(false)} onDone={refresh} />}
      {entry && <EntryDialog item={entry} onClose={() => setEntry(null)} onDone={refresh} />}
      {exit && <ExitDialog item={exit} onClose={() => setExit(null)} onDone={refresh} />}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}

function NewItemDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [minimum, setMinimum] = useState("1");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_items").insert({ name: name.trim(), category, minimum: Number(minimum) || 0, balance: 0 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item cadastrado. Registre uma entrada para lançar o saldo."); onDone(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nome*"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Estoque mínimo"><Input type="number" min={0} value={minimum} onChange={(e) => setMinimum(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name.trim() || m.isPending} onClick={() => m.mutate()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntryDialog({ item, onClose, onDone }: { item: Item; onClose: () => void; onDone: () => void }) {
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");
  const [lot, setLot] = useState(item.lot ?? "");
  const [expiry, setExpiry] = useState(item.expiry_date ?? "");
  const [value, setValue] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("stock_entry", {
        _item: item.id, _qty: Number(qty), _supplier: supplier, _lot: lot,
        _expiry: (expiry || null) as string, _value: (value ? Number(value.replace(",", ".")) : null) as number,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entrada registrada."); onDone(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Entrada (compra) — {item.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Fornecedor"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field></div>
          <Field label="Quantidade*"><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Valor total (R$)"><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          <Field label="Lote"><Input value={lot} onChange={(e) => setLot(e.target.value)} /></Field>
          <Field label="Validade"><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
        </div>
        {lot.trim() && lot.trim() !== (item.lot ?? "") && (
          <p className="text-xs text-muted-foreground">Lote novo: será criada uma linha separada para este lote.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!(Number(qty) > 0) || m.isPending} onClick={() => m.mutate()}>Registrar entrada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExitDialog({ item, onClose, onDone }: { item: Item; onClose: () => void; onDone: () => void }) {
  const expired = !!item.expiry_date && daysTo(item.expiry_date) < 0;
  const [qty, setQty] = useState(expired ? String(item.balance) : "");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"saida" | "descarte">(expired ? "descarte" : "saida");
  const n = Number(qty);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("stock_exit", { _item: item.id, _qty: n, _kind: kind, _note: note });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(kind === "descarte" ? "Baixa por descarte registrada." : "Saída registrada."); onDone(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{kind === "descarte" ? "Baixa por descarte" : "Saída (consumo)"} — {item.name}</DialogTitle></DialogHeader>
        {expired && (
          <div className="rounded-md border border-alert/40 bg-alert-bg p-3 text-sm text-alert">
            Lote {item.lot ?? ""} vencido em {fmtDate(item.expiry_date)} — a saída para uso está bloqueada. Faça a baixa por descarte.
          </div>
        )}
        <div className="space-y-3">
          <Field label={`Quantidade* (saldo: ${item.balance})`}>
            <Input type="number" min={1} max={item.balance} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Observação"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          {!expired && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={kind === "descarte"} onChange={(e) => setKind(e.target.checked ? "descarte" : "saida")} />
              Registrar como descarte (perda, dano)
            </label>
          )}
          {n > item.balance && <p className="text-xs text-alert">Quantidade maior que o saldo.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!(n > 0) || n > item.balance || m.isPending} onClick={() => m.mutate()}>
            {kind === "descarte" ? "Baixa por descarte" : "Registrar saída"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
