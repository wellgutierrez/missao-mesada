"use server";

import { revalidatePath } from "next/cache";
import { getAdminMembership, type AdminRole } from "@/features/admin/data/get-admin-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function upsertAdminUserAction(email: string, role: AdminRole, note: string) {
  const membership = await getAdminMembership();

  if (!membership || membership.role !== "owner") {
    return { error: "Apenas owners podem cadastrar administradores." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { error: "Informe o email do usuario." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("upsert_admin_user_by_email", {
    target_email: normalizedEmail,
    target_role: role,
    target_note: note.trim() || null
  });

  if (error) {
    console.warn("Erro ao cadastrar administrador:", error);
    return { error: error.message || "Nao foi possivel salvar o administrador." };
  }

  revalidatePath("/admin");

  return { success: true as const };
}