import Link from "next/link";
import { AdminUserManager } from "@/features/admin/components/admin-user-manager";
import type { AdminDashboardSnapshot, AdminRole, AdminUserRecord } from "@/features/admin/data/get-admin-dashboard";

type AdminDashboardPageProps = {
  role: AdminRole;
  snapshot: AdminDashboardSnapshot;
  adminUsers?: AdminUserRecord[];
  errorMessage?: string;
  adminUsersErrorMessage?: string;
};

export function AdminDashboardPage({ role, snapshot, adminUsers = [], errorMessage, adminUsersErrorMessage }: AdminDashboardPageProps) {
  const cards = [
    { label: "Usuarios cadastrados", value: snapshot.totals.registered_users },
    { label: "Admins liberados", value: snapshot.totals.admin_users },
    { label: "Perfis responsaveis", value: snapshot.totals.responsible_profiles },
    { label: "Criancas cadastradas", value: snapshot.totals.children },
    { label: "Tarefas totais", value: snapshot.totals.tasks },
    { label: "Tarefas ativas", value: snapshot.totals.active_tasks },
    { label: "Periodos abertos", value: snapshot.totals.open_periods },
    { label: "Periodos fechados", value: snapshot.totals.closed_periods },
    { label: "Resumos salvos", value: snapshot.totals.period_summaries },
    { label: "Registros de tarefas", value: snapshot.totals.task_logs },
    { label: "Eventos de historico", value: snapshot.totals.task_log_events }
  ];

  return (
    <div className="min-h-screen bg-app-bg text-slate-900">
      <header className="border-b border-app-line bg-white/95 backdrop-blur">
        <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-primary">Painel administrativo</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Controle geral do app</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="inline-flex min-h-11 items-center justify-center rounded-xl bg-app-soft px-4 text-sm font-semibold text-app-primary">
              Papel: {role}
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-app-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voltar ao app
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-primary">Visao geral</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-slate-900">
            Acompanhe crescimento, cadastros e uso do sistema em um unico lugar
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Este painel concentra a saude operacional do Missao Mesada: quantos usuarios entraram, quantas criancas estao ativas no sistema e como as familias estao usando tarefas e periodos.
          </p>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-[22px] border border-app-line bg-slate-50 px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-slate-900">{formatNumber(card.value)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ultimos cadastros</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Usuarios mais recentes</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {snapshot.recent_signups.length > 0 ? (
                snapshot.recent_signups.map((signup) => (
                  <div key={signup.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-line bg-slate-50 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{signup.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">ID {truncateId(signup.user_id)}</p>
                    </div>
                    <p className="text-sm text-slate-500">{formatDateTime(signup.created_at)}</p>
                  </div>
                ))
              ) : (
                <EmptyBlock message="Nenhum usuario cadastrado ainda." />
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Atividade recente</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Criancas adicionadas</h2>

            <div className="mt-6 space-y-3">
              {snapshot.recent_children.length > 0 ? (
                snapshot.recent_children.map((recentChild) => (
                  <div key={recentChild.child_id} className="rounded-2xl border border-app-line bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{recentChild.name}</p>
                      <p className="text-sm text-slate-500">{formatDateTime(recentChild.created_at)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Responsavel: {recentChild.owner_name} · {recentChild.age ? `${recentChild.age} anos` : "Idade nao informada"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyBlock message="Nenhuma crianca cadastrada ainda." />
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Familias com mais uso</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Top familias por volume</h2>

          <div className="mt-6 overflow-x-auto">
            {snapshot.top_families.length > 0 ? (
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-4">Responsavel</th>
                    <th className="px-4">Criancas</th>
                    <th className="px-4">Tarefas</th>
                    <th className="px-4">Periodos abertos</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.top_families.map((family) => (
                    <tr key={family.owner_user_id} className="rounded-2xl bg-slate-50 text-sm text-slate-700">
                      <td className="rounded-l-2xl px-4 py-4 font-semibold text-slate-900">{family.owner_name}</td>
                      <td className="px-4 py-4">{formatNumber(family.children_count)}</td>
                      <td className="px-4 py-4">{formatNumber(family.tasks_count)}</td>
                      <td className="rounded-r-2xl px-4 py-4">{formatNumber(family.open_periods_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyBlock message="Ainda nao ha familias suficientes para ranking." />
            )}
          </div>
        </section>

        {role === "owner" ? <AdminUserManager adminUsers={adminUsers} errorMessage={adminUsersErrorMessage} /> : null}
      </main>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-app-line bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function truncateId(value: string) {
  return `${value.slice(0, 8)}...`;
}