import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AllowancePeriod, PeriodType, PeriodSummary } from "../types";

function getPeriodsSupabaseClient() {
  return createBrowserSupabaseClient();
}

async function getCurrentUserId() {
  const supabase = getPeriodsSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
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
    console.error("getOpenPeriodByChild: childId invalido");
    return null;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = getPeriodsSupabaseClient();
  const { data, error } = await supabase
    .from("allowance_periods")
    .select("id, child_id, owner_user_id, period_type, start_date, end_date, base_allowance, bonus_goal, reward_title, status, created_at, closed_at")
    .eq("child_id", childId)
    .eq("owner_user_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar periodo aberto:", error.message ?? error);
    return null;
  }

  return data ? (data as AllowancePeriod) : null;
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
    console.error("createOpenPeriod: childId invalido");
    return null;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = getPeriodsSupabaseClient();
  const endDate = calculateEndDate(startDate, periodType);

  const existingOpen = await getOpenPeriodByChild(childId);
  if (existingOpen) {
    return existingOpen;
  }

  const { data, error } = await supabase
    .from("allowance_periods")
    .insert([
      {
        child_id: childId,
        owner_user_id: userId,
        period_type: periodType,
        start_date: startDate,
        end_date: endDate,
        base_allowance: baseAmount,
        reward_title: rewardTitle,
        bonus_goal: bonusGoal,
        status: "open"
      }
    ])
    .select("id, child_id, owner_user_id, period_type, start_date, end_date, base_allowance, bonus_goal, reward_title, status, created_at, closed_at")
    .single();

  if (error) {
    console.error("Erro ao criar periodo:", error.message ?? error);
    return null;
  }

  return data as AllowancePeriod;
}

export async function closePeriod(
  periodId: string,
  childId: string,
  baseAllowance: number,
  totalBonus: number,
  totalDiscount: number,
  finalAmount: number,
  bonusGoal: number,
  bonusCompleted: number,
  rewardTitle: string,
  startedAt: string,
  endedAt: string
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return false;
  }

  const supabase = getPeriodsSupabaseClient();

  const exists = await checkPeriodSummaryExists(periodId);
  if (!exists) {
    const rewardAchieved = bonusCompleted >= bonusGoal;
    const summary = await createPeriodSummary(
      periodId,
      childId,
      baseAllowance,
      totalBonus,
      totalDiscount,
      finalAmount,
      bonusGoal,
      bonusCompleted,
      rewardTitle,
      rewardAchieved,
      startedAt,
      endedAt
    );

    if (!summary) {
      return false;
    }
  }

  const { error } = await supabase
    .from("allowance_periods")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", periodId)
    .eq("owner_user_id", userId);

  if (error) {
    console.error("Erro ao encerrar periodo:", error.message ?? error);
    return false;
  }

  return true;
}

export async function checkPeriodSummaryExists(periodId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return false;
  }

  const supabase = getPeriodsSupabaseClient();
  const { data, error } = await supabase
    .from("period_summaries")
    .select("id")
    .eq("period_id", periodId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar se summary existe:", error.message ?? error);
    return false;
  }

  return !!data;
}

export async function createPeriodSummary(
  periodId: string,
  childId: string,
  baseAllowance: number,
  totalBonus: number,
  totalDiscount: number,
  finalAmount: number,
  bonusGoal: number,
  bonusCompleted: number,
  rewardTitle: string,
  rewardAchieved: boolean,
  startedAt: string,
  endedAt: string
): Promise<PeriodSummary | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = getPeriodsSupabaseClient();
  const { data, error } = await supabase
    .from("period_summaries")
    .insert([
      {
        period_id: periodId,
        child_id: childId,
        owner_user_id: userId,
        base_allowance: baseAllowance,
        total_bonus: totalBonus,
        total_discount: totalDiscount,
        final_amount: finalAmount,
        bonus_goal: bonusGoal,
        bonus_completed: bonusCompleted,
        reward_title: rewardTitle,
        reward_achieved: rewardAchieved,
        started_at: startedAt,
        ended_at: endedAt
      }
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar period summary:", error.message ?? error);
    return null;
  }

  return data as PeriodSummary;
}

export async function getPeriodSummariesByChild(childId: string): Promise<PeriodSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  const supabase = getPeriodsSupabaseClient();
  const { data, error } = await supabase
    .from("period_summaries")
    .select("*")
    .eq("child_id", childId)
    .eq("owner_user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar period summaries:", error.message ?? error);
    return [];
  }

  return (data ?? []) as PeriodSummary[];
}