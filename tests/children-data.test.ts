import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockHasSupabaseEnv,
  mockRequireAuth,
  mockCreateServerSupabaseClient
} = vi.hoisted(() => ({
  mockHasSupabaseEnv: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockCreateServerSupabaseClient: vi.fn()
}));

vi.mock("@/lib/supabase/config", () => ({
  hasSupabaseEnv: mockHasSupabaseEnv
}));

vi.mock("@/features/auth/data/get-auth-user", () => ({
  requireAuth: mockRequireAuth
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockCreateServerSupabaseClient
}));

import { createChild, deleteChild, getChildren } from "@/features/children/data/get-children";

describe("children data flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasSupabaseEnv.mockReturnValue(true);
    mockRequireAuth.mockResolvedValue({ id: "user-123" });
  });

  it("returns a friendly error when Supabase is not configured", async () => {
    mockHasSupabaseEnv.mockReturnValue(false);

    await expect(getChildren()).resolves.toEqual({
      children: [],
      errorMessage: "Configure as variaveis de ambiente do Supabase para carregar as criancas."
    });
    expect(mockRequireAuth).not.toHaveBeenCalled();
    expect(mockCreateServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("loads children for the authenticated owner", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: "child-1", name: "Ana", age: 9, base_allowance: 20, owner_user_id: "user-123" }],
      error: null
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    mockCreateServerSupabaseClient.mockResolvedValue({ from });

    const result = await getChildren();

    expect(from).toHaveBeenCalledWith("children");
    expect(eq).toHaveBeenCalledWith("owner_user_id", "user-123");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result.children).toHaveLength(1);
    expect(result.errorMessage).toBeUndefined();
  });

  it("validates child age before inserting", async () => {
    await expect(createChild("Ana", 3, 20)).resolves.toEqual({
      child: null,
      errorMessage: "A idade precisa estar entre 4 e 18 anos."
    });

    expect(mockCreateServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("creates a child scoped to the authenticated owner", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "child-1",
        name: "Ana",
        age: 9,
        base_allowance: 20,
        owner_user_id: "user-123",
        created_at: "2026-04-22T12:00:00Z"
      },
      error: null
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    mockCreateServerSupabaseClient.mockResolvedValue({ from });

    const result = await createChild("Ana", 9, 20);

    expect(from).toHaveBeenCalledWith("children");
    expect(insert).toHaveBeenCalledWith([
      {
        name: "Ana",
        age: 9,
        base_allowance: 20,
        owner_user_id: "user-123"
      }
    ]);
    expect(result.child?.owner_user_id).toBe("user-123");
  });

  it("stops and returns the deletion error when one table cleanup fails", async () => {
    const resultsByTable = {
      task_log_events: { error: null },
      task_logs: { error: null },
      period_summaries: { error: null },
      allowance_periods: { error: { message: "falha ao limpar periodos" } },
      tasks: { error: null },
      children: { error: null }
    } satisfies Record<string, { error: { message: string } | null }>;

    const from = vi.fn((table: string) => ({
      delete() {
        let eqCalls = 0;

        return {
          eq() {
            eqCalls += 1;

            if (eqCalls >= 2) {
              return Promise.resolve(resultsByTable[table]);
            }

            return this;
          }
        };
      }
    }));

    mockCreateServerSupabaseClient.mockResolvedValue({ from });

    await expect(deleteChild("child-1")).resolves.toEqual({
      errorMessage: "Erro ao excluir crianca: falha ao limpar periodos"
    });
    expect(from.mock.calls.map(([table]) => table)).toEqual([
      "task_log_events",
      "task_logs",
      "period_summaries",
      "allowance_periods",
      "tasks",
      "children"
    ]);
  });
});