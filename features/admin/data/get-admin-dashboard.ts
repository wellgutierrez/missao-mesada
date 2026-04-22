import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/features/auth/data/get-auth-user";

export type AdminRole = "owner" | "manager" | "viewer";

export type AdminMembership = {
  userId: string;
  role: AdminRole;
};

export type AdminDashboardTotals = {
  registered_users: number;
  admin_users: number;
  responsible_profiles: number;
  children: number;
  tasks: number;
  active_tasks: number;
  open_periods: number;
  closed_periods: number;
  period_summaries: number;
  task_logs: number;
  task_log_events: number;
};

export type AdminRecentSignup = {
  user_id: string;
  email: string;
  created_at: string | null;
};

export type AdminRecentChild = {
  child_id: string;
  name: string;
  age: number | null;
  owner_name: string;
  created_at: string | null;
};

export type AdminTopFamily = {
  owner_user_id: string;
  owner_name: string;
  children_count: number;
  tasks_count: number;
  open_periods_count: number;
};

export type AdminActivationFunnel = {
  registered_users: number;
  users_with_children: number;
  children_with_tasks: number;
  periods_with_task_logs: number;
};

export type AdminRecentActivity = {
  task_logs_last_7_days: number;
  active_users_last_7_days: number;
  closed_periods_last_7_days: number;
};

export type AdminAlertRecord = {
  id: "users_without_children" | "children_without_tasks" | "periods_without_task_logs";
  count: number;
};

export type AdminUserRecord = {
  user_id: string;
  email: string;
  role: AdminRole;
  note: string | null;
  created_at: string | null;
};

export type AdminDashboardSnapshot = {
  totals: AdminDashboardTotals;
  activation_funnel: AdminActivationFunnel;
  recent_activity: AdminRecentActivity;
  alerts: AdminAlertRecord[];
  recent_signups: AdminRecentSignup[];
  recent_children: AdminRecentChild[];
  top_families: AdminTopFamily[];
};

const EMPTY_SNAPSHOT: AdminDashboardSnapshot = {
  totals: {
    registered_users: 0,
    admin_users: 0,
    responsible_profiles: 0,
    children: 0,
    tasks: 0,
    active_tasks: 0,
    open_periods: 0,
    closed_periods: 0,
    period_summaries: 0,
    task_logs: 0,
    task_log_events: 0
  },
  activation_funnel: {
    registered_users: 0,
    users_with_children: 0,
    children_with_tasks: 0,
    periods_with_task_logs: 0
  },
  recent_activity: {
    task_logs_last_7_days: 0,
    active_users_last_7_days: 0,
    closed_periods_last_7_days: 0
  },
  alerts: [],
  recent_signups: [],
  recent_children: [],
  top_families: []
};

export const getAdminMembership = cache(async (): Promise<AdminMembership | null> => {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Nao foi possivel validar acesso administrativo:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    role: data.role as AdminRole
  };
});

export async function hasAdminAccess() {
  return Boolean(await getAdminMembership());
}

export async function requireAdmin() {
  const membership = await getAdminMembership();

  if (!membership) {
    redirect("/");
  }

  return membership;
}

export async function getAdminDashboardSnapshot(): Promise<{
  snapshot: AdminDashboardSnapshot;
  errorMessage?: string;
}> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_dashboard_snapshot");

  if (error) {
    console.error("Erro ao carregar dashboard administrativo:", error);
    return {
      snapshot: EMPTY_SNAPSHOT,
      errorMessage: `Erro ao carregar painel administrativo: ${error.message}`
    };
  }

  return {
    snapshot: normalizeSnapshot(data)
  };
}

export async function getAdminUsers(): Promise<{
  adminUsers: AdminUserRecord[];
  errorMessage?: string;
}> {
  const membership = await requireAdmin();

  if (membership.role !== "owner") {
    return { adminUsers: [] };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_users");

  if (error) {
    console.warn("Erro ao carregar administradores:", error);
    return {
      adminUsers: [],
      errorMessage: `Erro ao carregar administradores: ${error.message}`
    };
  }

  return {
    adminUsers: Array.isArray(data) ? (data as AdminUserRecord[]) : []
  };
}

function normalizeSnapshot(value: unknown): AdminDashboardSnapshot {
  if (!isObjectRecord(value)) {
    return EMPTY_SNAPSHOT;
  }

  const raw = value as Partial<AdminDashboardSnapshot>;

  return {
    totals: {
      ...EMPTY_SNAPSHOT.totals,
      ...(isObjectRecord(raw.totals) ? raw.totals : {})
    },
    activation_funnel: {
      ...EMPTY_SNAPSHOT.activation_funnel,
      ...(isObjectRecord(raw.activation_funnel) ? raw.activation_funnel : {})
    },
    recent_activity: {
      ...EMPTY_SNAPSHOT.recent_activity,
      ...(isObjectRecord(raw.recent_activity) ? raw.recent_activity : {})
    },
    alerts: Array.isArray(raw.alerts) ? (raw.alerts as AdminAlertRecord[]) : [],
    recent_signups: Array.isArray(raw.recent_signups) ? (raw.recent_signups as AdminRecentSignup[]) : [],
    recent_children: Array.isArray(raw.recent_children) ? (raw.recent_children as AdminRecentChild[]) : [],
    top_families: Array.isArray(raw.top_families) ? (raw.top_families as AdminTopFamily[]) : []
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}