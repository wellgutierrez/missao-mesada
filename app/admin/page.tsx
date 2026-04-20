import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboardPage } from "@/features/admin/components/admin-dashboard-page";
import { getAdminDashboardSnapshot, getAdminMembership, getAdminUsers } from "@/features/admin/data/get-admin-dashboard";
import { getAuthUser } from "@/features/auth/data/get-auth-user";

export const metadata: Metadata = {
  title: "Admin | Missao Mesada"
};

export default async function AdminPage() {
  const [user, membership] = await Promise.all([getAuthUser(), getAdminMembership()]);

  if (!membership) {
    return (
      <div className="min-h-screen bg-app-bg px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-app-line bg-white p-8 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-primary">Painel administrativo</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-4xl">Acesso administrativo nao liberado</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Esta conta esta autenticada, mas nao foi encontrada na tabela <strong>public.admin_users</strong> do projeto Supabase conectado ao app.
          </p>

          <div className="mt-6 rounded-2xl border border-app-line bg-slate-50 px-5 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Conta atual</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{user?.email ?? "Usuario sem email na sessao"}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Se esta for a conta correta, confirme no Supabase se o <strong>user_id</strong> dessa conta esta cadastrado em <strong>public.admin_users</strong>.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-app-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voltar ao app
            </Link>
            <Link
              href="/perfil"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-app-primary px-4 text-sm font-semibold text-white hover:bg-app-primary-dark"
            >
              Ver perfil atual
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [{ snapshot, errorMessage }, adminUsersResult] = await Promise.all([
    getAdminDashboardSnapshot(),
    membership.role === "owner" ? getAdminUsers() : Promise.resolve({ adminUsers: [] })
  ]);

  return (
    <AdminDashboardPage
      role={membership.role}
      snapshot={snapshot}
      adminUsers={adminUsersResult.adminUsers}
      errorMessage={errorMessage}
      adminUsersErrorMessage={adminUsersResult.errorMessage}
    />
  );
}