import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./permissions";

export type CurrentUser = { id: string; name: string; email: string; role: AppRole | null };

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const [{ data: prof }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", u.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", u.id),
  ]);
  const order: AppRole[] = ["admin", "recepcionista", "dentista"];
  const role = order.find((r) => roles?.some((x) => x.role === r)) ?? null;
  return { id: u.id, name: prof?.full_name ?? u.email ?? "", email: u.email ?? "", role };
}

export const currentUserQuery = queryOptions({ queryKey: ["current-user"], queryFn: fetchCurrentUser, staleTime: 60_000 });
export const useCurrentUser = () => useQuery(currentUserQuery);
