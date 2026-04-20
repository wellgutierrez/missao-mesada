import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { requireAuth } from "@/features/auth/data/get-auth-user";
import type { Child } from "../types";

type GetChildResult = {
  child: Child | null;
  errorMessage?: string;
};

export async function getChildById(id: string): Promise<GetChildResult> {
  if (!hasSupabaseEnv()) {
    return {
      child: null,
      errorMessage: "Configure as variaveis de ambiente do Supabase para carregar a crianca."
    };
  }

  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const { data: child, error } = await supabase
      .from("children")
      .select("id, name, age, base_allowance, owner_user_id, created_at")
      .eq("id", id)
      .eq("owner_user_id", user.id)
      .single();

    if (error) {
      return {
        child: null,
        errorMessage: "Erro ao carregar a crianca."
      };
    }

    return { child: child as Child };
  } catch {
    return {
      child: null,
      errorMessage: "Erro inesperado ao carregar a crianca."
    };
  }
}
