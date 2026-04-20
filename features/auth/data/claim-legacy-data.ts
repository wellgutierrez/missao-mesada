import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function claimLegacyDataIfNeeded() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("claim_legacy_family_data");

  if (!error) {
    return;
  }

  const message = error.message.toLowerCase();
  const isMissingFunction =
    message.includes("claim_legacy_family_data") &&
    (message.includes("does not exist") || message.includes("could not find"));

  if (!isMissingFunction) {
    console.warn("Nao foi possivel executar claim_legacy_family_data:", error);
  }
}