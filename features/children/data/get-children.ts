import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Child } from "../types";
import { createFirstPeriod } from "./periods";

type GetChildrenResult = {
  children: Child[];
  errorMessage?: string;
};

export async function getChildren(): Promise<GetChildrenResult> {
  if (!hasSupabaseEnv()) {
    return {
      children: [],
      errorMessage:
        "Configure as variaveis de ambiente do Supabase para carregar as criancas."
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("children")
      .select("id, name, age, base_allowance, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar children:", error);
      return {
        children: [],
        errorMessage: `Erro ao carregar crianças: ${error.message}`
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

  try {
    const supabase = createServerSupabaseClient();

    const { data: childData, error: createError } = await supabase
      .from("children")
      .insert([{ name, age, base_allowance: baseAllowance }])
      .select()
      .single();

    if (createError) {
      console.error("Erro ao criar criança:", createError);
      return {
        child: null,
        errorMessage: `Erro ao criar criança: ${createError.message}`
      };
    }

    const child = childData as Child;

    const firstPeriod = await createFirstPeriod(child.id, baseAllowance);
    if (!firstPeriod) {
      console.warn("Aviso: período inicial não foi criado para", child.id);
    }

    return { child };
  } catch (err) {
    console.error("Erro inesperado ao criar criança:", err);
    return {
      child: null,
      errorMessage: "Erro inesperado ao criar criança."
    };
  }
}
