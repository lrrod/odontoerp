export type AppRole = "admin" | "dentista" | "recepcionista";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  dentista: "Dentista",
  recepcionista: "Recepcionista",
};

export const MODULES = [
  { key: "painel", title: "Painel", to: "/painel", roles: ["admin", "dentista", "recepcionista"] },
  { key: "pacientes", title: "Pacientes", to: "/pacientes", roles: ["admin", "recepcionista"] },
  { key: "agenda", title: "Agenda", to: "/agenda", roles: ["admin", "dentista", "recepcionista"] },
  { key: "prontuarios", title: "Prontuários", to: "/prontuarios", roles: ["admin", "dentista"] },
  { key: "orcamentos", title: "Orçamentos", to: "/orcamentos", roles: ["admin", "recepcionista"] },
  { key: "financeiro", title: "Financeiro", to: "/financeiro", roles: ["admin", "recepcionista"] },
  { key: "estoque", title: "Estoque", to: "/estoque", roles: ["admin"] },
  { key: "relatorios", title: "Relatórios", to: "/relatorios", roles: ["admin"] },
  { key: "configuracoes", title: "Configurações", to: "/configuracoes", roles: ["admin"] },
] as const satisfies ReadonlyArray<{ key: string; title: string; to: string; roles: AppRole[] }>;

export function canAccess(role: AppRole | null | undefined, path: string) {
  if (!role) return false;
  const m = MODULES.find((x) => path === x.to || path.startsWith(x.to + "/"));
  return !m || (m.roles as readonly AppRole[]).includes(role);
}
