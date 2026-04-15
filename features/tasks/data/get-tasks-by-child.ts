import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Task } from "../types";

export async function getTasksByChildId(childId: string): Promise<Task[]> {
  if (!hasSupabaseEnv()) {
    console.error("Supabase environment is not configured.");
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, type, amount, is_active")
    .eq("child_id", childId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar tarefas do child:", error);
    return [];
  }

  return (data ?? []) as Task[];
}