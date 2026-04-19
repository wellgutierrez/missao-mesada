import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Task } from "../types";

const supabase = createBrowserSupabaseClient();

export type TaskHistoryAction = "add" | "remove";

export type TaskHistoryEntry = {
  id: string;
  childId: string;
  periodId: string;
  taskId: string;
  taskTitle: string;
  taskAmount: number;
  taskType: Task["type"];
  action: TaskHistoryAction;
  createdAt: string;
};

type TaskLogEventRow = {
  id: string;
  child_id: string;
  period_id: string;
  task_id: string;
  task_type: Task["type"];
  action: TaskHistoryAction;
  created_at: string;
  task?: {
    title: string;
    amount: number;
  } | null;
};

export async function getTaskLogEventsByPeriod(
  childId: string,
  periodId: string
): Promise<TaskHistoryEntry[]> {
  const { data, error } = await supabase
    .from("task_log_events")
    .select("id, child_id, period_id, task_id, task_type, action, created_at, task:tasks(title, amount)")
    .eq("child_id", childId)
    .eq("period_id", periodId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar task_log_events:", error.message ?? error);
    return [];
  }

  return (data ?? []).map(mapTaskLogEventRow);
}

export async function createTaskLogEvent(
  childId: string,
  periodId: string,
  task: Task,
  action: TaskHistoryAction
): Promise<boolean> {
  const { error } = await supabase.from("task_log_events").insert([
    {
      child_id: childId,
      period_id: periodId,
      task_id: task.id,
      task_type: task.type,
      action
    }
  ]);

  if (error) {
    console.error("Erro ao criar task_log_event:", error.message ?? error);
    return false;
  }

  return true;
}

function mapTaskLogEventRow(row: TaskLogEventRow): TaskHistoryEntry {
  return {
    id: row.id,
    childId: row.child_id,
    periodId: row.period_id,
    taskId: row.task_id,
    taskTitle: row.task?.title ?? "Tarefa",
    taskAmount: row.task?.amount ?? 0,
    taskType: row.task_type,
    action: row.action,
    createdAt: row.created_at
  };
}