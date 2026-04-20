"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAuth } from "@/features/auth/data/get-auth-user";

export async function updateProfileAction(fullName: string, phone: string) {
  const user = await requireAuth();

  if (fullName.trim().length < 3) {
    return { error: "Informe seu nome completo." };
  }

  const supabase = await createServerSupabaseClient();
  const normalizedPhone = phone.replace(/\D/g, "");

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName.trim(),
      phone: normalizedPhone || null
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Erro ao atualizar perfil:", error);
    return { error: "Nao foi possivel salvar o perfil." };
  }

  revalidatePath("/perfil");
  return { success: true as const };
}