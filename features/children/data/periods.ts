import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AllowancePeriod, PeriodType } from "../types";

function getPeriodsSupabaseClient() {
  return createBrowserSupabaseClient();
}

export function calculateEndDate(startDate: string, periodType: PeriodType) {
  const date = new Date(startDate);

  if (Number.isNaN(date.getTime())) {
    return startDate;
  }

  switch (periodType) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 15);
      break;
    case "monthly":
      date.setDate(date.getDate() + 30);
      break;
    default:
      date.setDate(date.getDate() + 7);
  }

  return date.toISOString().split("T")[0];
}

export async function getOpenPeriodByChild(childId: string): Promise<AllowancePeriod | null> {
  if (!childId?.trim()) {
    console.error("getOpenPeriodByChild: childId inválido");
    return null;
  }

  const supabase = getPeriodsSupabaseClient();
  const { data, error } = await supabase
    .from("allowance_periods")
    .select(
      "id, child_id, period_type, start_date, end_date, base_allowance, bonus_goal, reward_title, status, created_at, closed_at"
    )
    .eq("child_id", childId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar período aberto:", error.message ?? error);
    return null;
  }

  return data ? (data as AllowancePeriod) : null;
}

export async function getClosedPeriodsByChild(childId: string): Promise<AllowancePeriod[]> {
  if (!childId?.trim()) {
    console.error("getClosedPeriodsByChild: childId inválido");
    return [];
  }

  const supabase = getPeriodsSupabaseClient();
  const { data, error } = await supabase
    .from("allowance_periods")
    .select(
      "id, child_id, period_type, start_date, end_date, base_allowance, bonus_goal, reward_title, status, created_at, closed_at"
    )
    .eq("child_id", childId)
    .eq("status", "closed")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Erro ao buscar períodos fechados:", error.message ?? error);
    return [];
  }

  return (data ?? []) as AllowancePeriod[];
}

export async function createOpenPeriod(
  childId: string,
  periodType: PeriodType,
  startDate: string,
  baseAmount: number,
  rewardTitle: string,
  bonusGoal: number
): Promise<AllowancePeriod | null> {
  if (!childId?.trim()) {
    console.error("createOpenPeriod: childId inválido");
    return null;
  }

  const supabase = getPeriodsSupabaseClient();
  const endDate = calculateEndDate(startDate, periodType);

  const existingOpen = await getOpenPeriodByChild(childId);
  if (existingOpen) {
    console.warn("Já existe um período aberto para essa criança", childId);
    return existingOpen;
  }

  const { data, error } = await supabase
    .from("allowance_periods")
    .insert([
      {
        child_id: childId,
        period_type: periodType,
        start_date: startDate,
        end_date: endDate,
        base_allowance: baseAmount,
        reward_title: rewardTitle,
        bonus_goal: bonusGoal,
        status: "open"
      }
    ])
    .select(
      "id, child_id, period_type, start_date, end_date, base_allowance, bonus_goal, reward_title, status, created_at, closed_at"
    )
    .single();

  if (error) {
    console.error("Erro ao criar período:", error.message ?? error, {
      childId,
      periodType,
      startDate,
      baseAmount,
      rewardTitle,
      bonusGoal
    });
    return null;
  }

  return data as AllowancePeriod;
}

export async function closePeriod(periodId: string): Promise<boolean> {
  const supabase = getPeriodsSupabaseClient();
  const { error } = await supabase
    .from("allowance_periods")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", periodId);

  if (error) {
    console.error("Erro ao encerrar período:", error.message ?? error);
    return false;
  }

  return true;
}

export async function createFirstPeriod(
  childId: string,
  baseAmount: number
): Promise<AllowancePeriod | null> {
  const today = new Date().toISOString().split("T")[0];
  return createOpenPeriod(
    childId,
    "weekly",
    today,
    baseAmount,
    "Sem recompensa definida",
    5
  );
}
