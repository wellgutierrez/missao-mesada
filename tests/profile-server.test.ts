import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockCreateServerSupabaseClient,
  mockRevalidatePath
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockCreateServerSupabaseClient: vi.fn(),
  mockRevalidatePath: vi.fn()
}));

vi.mock("@/features/auth/data/get-auth-user", () => ({
  requireAuth: mockRequireAuth
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockCreateServerSupabaseClient
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath
}));

describe("profile server flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireAuth.mockResolvedValue({
      id: "user-123",
      email: "familia@email.com",
      user_metadata: {
        full_name: "Maria Silva",
        phone: "11999999999"
      }
    });
  });

  it("returns the stored profile merged with user email", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-123", full_name: "Maria Souza", phone: "11988887777" },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    mockCreateServerSupabaseClient.mockResolvedValue({ from });

    const { getResponsibleProfile } = await import("@/features/auth/data/get-profile");
    const result = await getResponsibleProfile();

    expect(from).toHaveBeenCalledWith("profiles");
    expect(eq).toHaveBeenCalledWith("id", "user-123");
    expect(result).toEqual({
      id: "user-123",
      full_name: "Maria Souza",
      phone: "11988887777",
      email: "familia@email.com"
    });
  });

  it("recreates the profile row from auth metadata when the profile is missing", async () => {
    const maybeSingleSelect = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle: maybeSingleSelect }));
    const select = vi.fn(() => ({ eq }));

    const maybeSingleUpsert = vi.fn().mockResolvedValue({
      data: { id: "user-123", full_name: "Maria Silva", phone: "11999999999" },
      error: null
    });
    const selectAfterUpsert = vi.fn(() => ({ maybeSingle: maybeSingleUpsert }));
    const upsert = vi.fn(() => ({ select: selectAfterUpsert }));

    const from = vi.fn(() => ({ select, upsert }));

    mockCreateServerSupabaseClient.mockResolvedValue({ from });

    const { getResponsibleProfile } = await import("@/features/auth/data/get-profile");
    const result = await getResponsibleProfile();

    expect(upsert).toHaveBeenCalledWith([
      {
        id: "user-123",
        full_name: "Maria Silva",
        phone: "11999999999"
      }
    ]);
    expect(result.full_name).toBe("Maria Silva");
    expect(result.phone).toBe("11999999999");
  });

  it("validates profile name before persisting", async () => {
    const { updateProfileAction } = await import("@/features/auth/actions/update-profile");

    await expect(updateProfileAction("Ma", "(11) 99999-9999")).resolves.toEqual({
      error: "Informe seu nome completo."
    });

    expect(mockCreateServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("normalizes the phone number and revalidates the profile page", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upsert }));

    mockCreateServerSupabaseClient.mockResolvedValue({ from });

    const { updateProfileAction } = await import("@/features/auth/actions/update-profile");
    await expect(updateProfileAction(" Maria Silva ", "(11) 99999-8888")).resolves.toEqual({ success: true });

    expect(upsert).toHaveBeenCalledWith(
      {
        id: "user-123",
        full_name: "Maria Silva",
        phone: "11999998888"
      },
      { onConflict: "id" }
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/perfil");
  });
});