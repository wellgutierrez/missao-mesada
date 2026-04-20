import type { Metadata } from "next";
import Link from "next/link";
import { AdminLink } from "@/features/admin/components/admin-link";
import { hasAdminAccess } from "@/features/admin/data/get-admin-dashboard";
import { claimLegacyDataIfNeeded } from "@/features/auth/data/claim-legacy-data";
import { getChildren } from "@/features/children/data/get-children";
import { DashboardShell } from "@/features/children/components/dashboard-shell";
import { ProfileForm } from "@/features/auth/components/profile-form";
import { getResponsibleProfile } from "@/features/auth/data/get-profile";

export const metadata: Metadata = {
  title: "Perfil | Missao Mesada"
};

export default async function PerfilPage() {
  await claimLegacyDataIfNeeded();
  const [profile, { children }, isAdmin] = await Promise.all([
    getResponsibleProfile(),
    getChildren(),
    hasAdminAccess()
  ]);

  return (
    <DashboardShell childList={children} headerActions={isAdmin ? <AdminLink /> : undefined}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <ProfileForm fullName={profile.full_name} phone={profile.phone} email={profile.email} />

        <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Atalhos</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-app-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voltar para o painel
            </Link>
            <Link
              href="/children/new"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-app-primary px-4 text-sm font-semibold text-white hover:bg-app-primary-dark"
            >
              Cadastrar crianca
            </Link>
            {isAdmin ? <AdminLink label="Painel admin" variant="shortcut" /> : null}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}