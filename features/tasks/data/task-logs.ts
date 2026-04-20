import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Task } from "../types";

export type TaskLogRow = {
  id: string;
  child_id: string;
  period_id: string;
  task_id: string;
  owner_user_id?: string | null;
  count: number;
  created_at?: string | null;
};

async function getUserScopedClient() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabase, userId: user?.id ?? null };
}

export async function getTaskLogsByPeriod(
  childId: string,
  periodId: string
): Promise<TaskLogRow[]> {
  const { supabase, userId } = await getUserScopedClient();
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("task_logs")
    .select("id, child_id, period_id, task_id, owner_user_id, count, created_at")
    .eq("child_id", childId)
    .eq("period_id", periodId)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar task_logs:", error.message ?? error);
    return [];
  }

  return (data ?? []) as TaskLogRow[];
}

export async function addTaskLog(
  childId: string,
  periodId: string,
  task: Task
): Promise<TaskLogRow | null> {
  const { supabase, userId } = await getUserScopedClient();
  if (!userId) {
    return null;
  }

  const { data: existing, error: selectError } = await supabase
    .from("task_logs")
    .select("id, count")
    .eq("child_id", childId)
    .eq("period_id", periodId)
    .eq("task_id", task.id)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("Erro ao buscar task_log existente:", selectError.message ?? selectError);
    return null;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("task_logs")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id)
      .eq("owner_user_id", userId)
      .select("id, child_id, period_id, task_id, owner_user_id, count, created_at")
      .single();

    if (error) {
      console.error("Erro ao atualizar task_log:", error.message ?? error);
      return null;
    }

    return data as TaskLogRow;
  }

  const { data, error } = await supabase
    .from("task_logs")
    .insert([
      {
        child_id: childId,
        period_id: periodId,
        task_id: task.id,
        owner_user_id: userId,
        count: 1
      }
    ])
    .select("id, child_id, period_id, task_id, owner_user_id, count, created_at")
    .single();

  if (error) {
    console.error("Erro ao inserir task_log:", error.message ?? error);
    return null;
  }

  return data as TaskLogRow;
}

export async function decrementTaskLog(
  childId: string,
  periodId: string,
  taskId: string
): Promise<boolean> {
  const { supabase, userId } = await getUserScopedClient();
  if (!userId) {
    return false;
  }

  const { data: existing, error: selectError } = await supabase
    .from("task_logs")
    .select("id, count")
    .eq("child_id", childId)
    .eq("period_id", periodId)
    .eq("task_id", taskId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("Erro ao buscar task_log existente:", selectError.message ?? selectError);
    return false;
  }

  if (!existing?.id) {
    return false;
  }

  if (existing.count <= 1) {
    const { error } = await supabase
      .from("task_logs")
      .delete()
      .eq("id", existing.id)
      .eq("owner_user_id", userId);

    if (error) {
      console.error("Erro ao deletar task_log:", error.message ?? error);
      return false;
    }

    return true;
  }

  const { error } = await supabase
    .from("task_logs")
    .update({ count: existing.count - 1 })
    .eq("id", existing.id)
    .eq("owner_user_id", userId);

  if (error) {
    console.error("Erro ao decrementar task_log:", error.message ?? error);
    return false;
  }

  return true;
}