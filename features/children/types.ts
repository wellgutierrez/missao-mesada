export type Child = {
  id: string;
  name: string;
  age: number | null;
  base_allowance: number | null;
  owner_user_id?: string | null;
  created_at?: string | null;
};

export type PeriodType = "weekly" | "biweekly" | "monthly";
export type PeriodStatus = "open" | "closed";

export type AllowancePeriod = {
  id: string;
  child_id: string;
  owner_user_id?: string | null;
  period_type: PeriodType;
  start_date: string;
  end_date: string | null;
  base_allowance: number | null;
  reward_title: string;
  status: PeriodStatus;
  created_at?: string | null;
  closed_at?: string | null;
  bonus_goal: number | null;
};

export type PeriodSummary = {
  id: string;
  period_id: string;
  child_id: string;
  owner_user_id?: string | null;
  base_allowance: number;
  total_bonus: number;
  total_discount: number;
  final_amount: number;
  bonus_goal: number;
  bonus_completed: number;
  reward_title: string;
  reward_achieved: boolean;
  started_at: string;
  ended_at: string;
  created_at?: string | null;
};