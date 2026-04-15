export type Child = {
  id: string;
  name: string;
  age: number | null;
  base_allowance: number | null;
  created_at?: string | null;
};

export type PeriodType = "weekly" | "biweekly" | "monthly";
export type PeriodStatus = "open" | "closed";

export type AllowancePeriod = {
  id: string;
  child_id: string;
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
