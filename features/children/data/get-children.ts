import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { requireAuth } from "@/features/auth/data/get-auth-user";
import type { Child } from "../types";

type GetChildrenResult = {
  children: Child[];
  errorMessage?: string;
};

export async function getChildren(): Promise<GetChildrenResult> {
  if (!hasSupabaseEnv()) {
    return {
      children: [],
      errorMessage: "Configure as variaveis de ambiente do Supabase para carregar as criancas."
    };
  }

  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("children")
      .select("id, name, age, base_allowance, owner_user_id, created_at")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar children:", error);
      return {
        children: [],
        errorMessage: `Erro ao carregar criancas: ${error.message}`
      };
    }

    return {
      children: (data ?? []) as Child[]
    };
  } catch (err) {
    console.error("Erro inesperado ao conectar no Supabase:", err);
    return {
      children: [],
      errorMessage: "Nao foi possivel conectar ao Supabase."
    };
  }
}

type CreateChildResult = {
  child: Child | null;
  errorMessage?: string;
};

type DeleteChildResult = {
  errorMessage?: string;
};

export async function createChild(
  name: string,
  age: number | null,
  baseAllowance: number
): Promise<CreateChildResult> {
  if (!hasSupabaseEnv()) {
    return {
      child: null,
      errorMessage: "Configure as variaveis de ambiente do Supabase."
    };
  }

  if (age == null || Number.isNaN(age)) {
    return {
      child: null,
      errorMessage: "Idade e obrigatoria."
    };
  }

  if (age < 4 || age > 18) {
    return {
      child: null,
      errorMessage: "A idade precisa estar entre 4 e 18 anos."
    };
  }

  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const { data: childData, error: createError } = await supabase
      .from("children")
      .insert([{ name, age, base_allowance: baseAllowance, owner_user_id: user.id }])
      .select("id, name, age, base_allowance, owner_user_id, created_at")
      .single();

    if (createError) {
      console.error("Erro ao criar crianca:", createError);
      return {
        child: null,
        errorMessage: `Erro ao criar crianca: ${createError.message}`
      };
    }

    const child = childData as Child;

    return { child };
  } catch (err) {
    console.error("Erro inesperado ao criar crianca:", err);
    return {
      child: null,
      errorMessage: "Erro inesperado ao criar crianca."
    };
  }
}

export async function deleteChild(id: string): Promise<DeleteChildResult> {
  if (!hasSupabaseEnv()) {
    return {
      errorMessage: "Configure as variaveis de ambiente do Supabase."
    };
  }

  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const deletions = [
      supabase.from("task_log_events").delete().eq("child_id", id).eq("owner_user_id", user.id),
      supabase.from("task_logs").delete().eq("child_id", id).eq("owner_user_id", user.id),
      supabase.from("period_summaries").delete().eq("child_id", id).eq("owner_user_id", user.id),
      supabase.from("allowance_periods").delete().eq("child_id", id).eq("owner_user_id", user.id),
      supabase.from("tasks").delete().eq("child_id", id).eq("owner_user_id", user.id),
      supabase.from("children").delete().eq("id", id).eq("owner_user_id", user.id)
    ];

    for (const deletion of deletions) {
      const { error } = await deletion;

      if (error) {
        console.error("Erro ao excluir crianca:", error);
        return {
          errorMessage: `Erro ao excluir crianca: ${error.message}`
        };
      }
    }

    return {};
  } catch (err) {
    console.error("Erro inesperado ao excluir crianca:", err);
    return {
      errorMessage: "Erro inesperado ao excluir crianca."
    };
  }
}
