import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Child } from "../types";

type GetChildResult = {
  child: Child | null;
  errorMessage?: string;
};

export async function getChildById(id: string): Promise<GetChildResult> {
  if (!hasSupabaseEnv()) {
    return {
      child: null,
      errorMessage:
        "Configure as variaveis de ambiente do Supabase para carregar a crianca."
    };
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: child, error } = await supabase
      .from("children")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return {
        child: null,
        errorMessage: "Erro ao carregar a crianca."
      };
    }

    return { child };
  } catch {
    return {
      child: null,
      errorMessage: "Erro inesperado ao carregar a crianca."
    };
  }
}
