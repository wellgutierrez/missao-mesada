import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { requireAuth } from "@/features/auth/data/get-auth-user";
import type { Task } from "../types";

export async function getTasksByChildId(childId: string): Promise<Task[]> {
  if (!hasSupabaseEnv()) {
    console.error("Supabase environment is not configured.");
    return [];
  }

  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, type, amount, owner_user_id, is_active")
    .eq("child_id", childId)
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar tarefas do child:", error);
    return [];
  }

  return (data ?? []) as Task[];
}