import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAuth } from "./get-auth-user";

export type ResponsibleProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
};

export async function getResponsibleProfile(): Promise<ResponsibleProfile> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();
  const fallbackProfile = buildFallbackProfile(user);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const recoveredProfile = await ensureProfileRow(supabase, fallbackProfile);
    return recoveredProfile ?? fallbackProfile;
  }

  if (!data) {
    const recoveredProfile = await ensureProfileRow(supabase, fallbackProfile);
    return recoveredProfile ?? fallbackProfile;
  }

  return {
    id: user.id,
    full_name: data.full_name || fallbackProfile.full_name,
    phone: data.phone ?? fallbackProfile.phone,
    email: fallbackProfile.email
  };
}

function buildFallbackProfile(user: Awaited<ReturnType<typeof requireAuth>>): ResponsibleProfile {
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "";
  const metadataPhone = typeof user.user_metadata.phone === "string" ? user.user_metadata.phone : null;
  const email = user.email ?? "";
  const fallbackName = metadataName || email.split("@")[0] || "Responsavel";

  return {
    id: user.id,
    full_name: fallbackName,
    phone: metadataPhone,
    email
  };
}

async function ensureProfileRow(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  profile: ResponsibleProfile
): Promise<ResponsibleProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert([
      {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone
      }
    ])
    .select("id, full_name, phone")
    .maybeSingle();

  if (error) {
    console.warn("Nao foi possivel sincronizar o perfil do responsavel:", error);
    return null;
  }

  return {
    id: profile.id,
    full_name: data?.full_name ?? profile.full_name,
    phone: data?.phone ?? profile.phone,
    email: profile.email
  };
}