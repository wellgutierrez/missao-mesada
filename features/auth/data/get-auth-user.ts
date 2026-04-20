import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getAuthUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  const isMissingSessionError =
    error?.name === "AuthSessionMissingError" || error?.message?.toLowerCase().includes("auth session missing");

  if (error && !isMissingSessionError) {
    console.error("Erro ao carregar usuario autenticado:", error);
  }

  return user ?? null;
});

export async function requireAuth() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getAuthUser();

  if (user) {
    redirect("/");
  }
}