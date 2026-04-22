import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetAdminMembership,
  mockCreateServerSupabaseClient,
  mockRevalidatePath
} = vi.hoisted(() => ({
  mockGetAdminMembership: vi.fn(),
  mockCreateServerSupabaseClient: vi.fn(),
  mockRevalidatePath: vi.fn()
}));

vi.mock("@/features/admin/data/get-admin-dashboard", () => ({
  getAdminMembership: mockGetAdminMembership
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockCreateServerSupabaseClient
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath
}));

import { upsertAdminUserAction } from "@/features/admin/actions/upsert-admin-user";

describe("upsertAdminUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-owner users before touching Supabase", async () => {
    mockGetAdminMembership.mockResolvedValue({ role: "manager" });

    await expect(upsertAdminUserAction("user@email.com", "viewer", ""))
      .resolves.toEqual({ error: "Apenas owners podem cadastrar administradores." });

    expect(mockCreateServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("validates email before calling the rpc", async () => {
    mockGetAdminMembership.mockResolvedValue({ role: "owner" });

    await expect(upsertAdminUserAction("   ", "viewer", ""))
      .resolves.toEqual({ error: "Informe o email do usuario." });

    expect(mockCreateServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("normalizes email and note, then revalidates the admin page on success", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });

    mockGetAdminMembership.mockResolvedValue({ role: "owner" });
    mockCreateServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(upsertAdminUserAction(" USER@Email.COM ", "manager", "  suporte  "))
      .resolves.toEqual({ success: true });

    expect(rpc).toHaveBeenCalledWith("upsert_admin_user_by_email", {
      target_email: "user@email.com",
      target_role: "manager",
      target_note: "suporte"
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("returns the rpc error message when Supabase rejects the operation", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "email inexistente" } });

    mockGetAdminMembership.mockResolvedValue({ role: "owner" });
    mockCreateServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(upsertAdminUserAction("user@email.com", "viewer", ""))
      .resolves.toEqual({ error: "email inexistente" });
  });
});