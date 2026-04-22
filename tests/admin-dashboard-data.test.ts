import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetAuthUser,
  mockCreateServerSupabaseClient,
  mockRedirect
} = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  mockCreateServerSupabaseClient: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
}));

vi.mock("@/features/auth/data/get-auth-user", () => ({
  getAuthUser: mockGetAuthUser
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockCreateServerSupabaseClient
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect
}));

describe("admin dashboard data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns null membership when no authenticated user exists", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const { getAdminMembership } = await import("@/features/admin/data/get-admin-dashboard");

    await expect(getAdminMembership()).resolves.toBeNull();
    expect(mockCreateServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("loads the current admin membership from Supabase", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-123", role: "owner" },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    mockGetAuthUser.mockResolvedValue({ id: "user-123" });
    mockCreateServerSupabaseClient.mockResolvedValue({ from });

    const { getAdminMembership } = await import("@/features/admin/data/get-admin-dashboard");
    const result = await getAdminMembership();

    expect(from).toHaveBeenCalledWith("admin_users");
    expect(eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(result).toEqual({ userId: "user-123", role: "owner" });
  });

  it("returns an empty snapshot with a friendly message when the dashboard rpc fails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-123", role: "manager" },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "rpc indisponivel" } });

    mockGetAuthUser.mockResolvedValue({ id: "user-123" });
    mockCreateServerSupabaseClient.mockResolvedValue({ from, rpc });

    const { getAdminDashboardSnapshot } = await import("@/features/admin/data/get-admin-dashboard");
    const result = await getAdminDashboardSnapshot();

    expect(rpc).toHaveBeenCalledWith("get_admin_dashboard_snapshot");
    expect(result.errorMessage).toBe("Erro ao carregar painel administrativo: rpc indisponivel");
    expect(result.snapshot.totals.registered_users).toBe(0);
    expect(result.snapshot.recent_signups).toEqual([]);
  });

  it("returns no admin users for non-owner memberships without calling the rpc", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-123", role: "viewer" },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const rpc = vi.fn();

    mockGetAuthUser.mockResolvedValue({ id: "user-123" });
    mockCreateServerSupabaseClient.mockResolvedValue({ from, rpc });

    const { getAdminUsers } = await import("@/features/admin/data/get-admin-dashboard");

    await expect(getAdminUsers()).resolves.toEqual({ adminUsers: [] });
    expect(rpc).not.toHaveBeenCalled();
  });
});