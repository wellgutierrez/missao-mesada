import Link from "next/link";
import { AdminCard } from "@/features/admin/components/admin-card";
import { AdminSection } from "@/features/admin/components/admin-section";
import { AdminUserManager } from "@/features/admin/components/admin-user-manager";
import type { AdminAlertRecord, AdminDashboardSnapshot, AdminRole, AdminUserRecord } from "@/features/admin/data/get-admin-dashboard";

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
  const funnelSteps = [
    { label: "Usuarios cadastrados", value: snapshot.activation_funnel.registered_users, helper: "Base total de contas autenticadas no produto." },
    { label: "Com crianca", value: snapshot.activation_funnel.users_with_children, helper: "Usuarios que deram o primeiro passo de configuracao familiar." },
    { label: "Com tarefas", value: snapshot.activation_funnel.children_with_tasks, helper: "Criancas com ao menos uma tarefa cadastrada." },
    { label: "Com registros", value: snapshot.activation_funnel.periods_with_task_logs, helper: "Periodos que ja registraram execucao de tarefas." }
  ];
  const recentActivityCards = [
    { label: "Registros nos ultimos 7 dias", value: snapshot.recent_activity.task_logs_last_7_days, helper: "Volume recente de uso operacional no app." },
    { label: "Usuarios ativos nos ultimos 7 dias", value: snapshot.recent_activity.active_users_last_7_days, helper: "Responsaveis com novos registros de tarefas no periodo." },
    { label: "Periodos fechados nos ultimos 7 dias", value: snapshot.recent_activity.closed_periods_last_7_days, helper: "Ciclos concluídos recentemente pelas familias." }
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
        <AdminSection
          eyebrow="Visao geral"
          title="Acompanhe crescimento, cadastros e uso do sistema em um unico lugar"
          description="Este painel concentra a saude operacional do Missao Mesada: quantos usuarios entraram, quantas criancas estao ativas no sistema e como as familias estao usando tarefas e periodos."
          className="rounded-[28px]"
        >

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <AdminCard key={card.label} className="rounded-[22px] bg-slate-50 px-5 py-5 shadow-none">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-slate-900">{formatNumber(card.value)}</p>
              </AdminCard>
            ))}
          </div>
        </AdminSection>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <AdminSection
            eyebrow="Funil de ativacao"
            title="Jornada de ativacao do produto"
            description="Veja quantas contas avancam da criacao para o uso real em tarefas e registros operacionais."
          >
            <div className="mt-6 space-y-3">
              {funnelSteps.map((step, index) => (
                <div key={step.label}>
                  <AdminCard className="rounded-[22px] bg-slate-50 px-5 py-5 shadow-none">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
                    <p className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-slate-900">{formatNumber(step.value)}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{step.helper}</p>
                  </AdminCard>
                  {index < funnelSteps.length - 1 ? <p className="py-2 text-center text-2xl font-black text-app-primary">↓</p> : null}
                </div>
              ))}
            </div>
          </AdminSection>

          <div className="grid gap-6">
            <AdminSection
              eyebrow="Atividade recente"
              title="Ultimos 7 dias"
              description="Leitura rapida de engajamento, atividade operacional e conclusao de periodos."
            >
              <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {recentActivityCards.map((item) => (
                  <AdminCard key={item.label} className="rounded-[22px] bg-slate-50 px-5 py-5 shadow-none">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-slate-900">{formatNumber(item.value)}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.helper}</p>
                  </AdminCard>
                ))}
              </div>
            </AdminSection>

            <AdminSection
              eyebrow="Alertas inteligentes"
              title="Saude automatica do produto"
              description="Problemas estruturais aparecem aqui para orientar decisoes de onboarding e retencao."
            >
              {snapshot.alerts.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {snapshot.alerts.map((alert) => (
                    <AdminCard key={alert.id} className="rounded-[22px] border-amber-200 bg-amber-50 px-5 py-5 shadow-none">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Alerta</p>
                          <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-slate-900">{getAlertTitle(alert)}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{getAlertDescription(alert)}</p>
                        </div>
                        <p className="text-3xl font-extrabold tracking-[-0.03em] text-amber-700">{formatNumber(alert.count)}</p>
                      </div>
                    </AdminCard>
                  ))}
                </div>
              ) : (
                <AdminCard className="mt-6 rounded-[22px] border-emerald-200 bg-emerald-50 px-5 py-6 shadow-none">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Sistema saudavel</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">✅ Tudo saudavel no sistema</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Nao existem gargalos estruturais relevantes neste momento para contas, criancas ou periodos.</p>
                </AdminCard>
              )}
            </AdminSection>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <AdminSection eyebrow="Ultimos cadastros" title="Usuarios mais recentes">

            <div className="mt-6 space-y-3">
              {snapshot.recent_signups.length > 0 ? (
                snapshot.recent_signups.map((signup) => (
                  <AdminCard key={signup.user_id} className="rounded-2xl bg-slate-50 px-4 py-4 shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{signup.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">ID {truncateId(signup.user_id)}</p>
                    </div>
                    <p className="text-sm text-slate-500">{formatDateTime(signup.created_at)}</p>
                    </div>
                  </AdminCard>
                ))
              ) : (
                <EmptyBlock message="Nenhum usuario cadastrado ainda." />
              )}
            </div>
          </AdminSection>

          <AdminSection eyebrow="Atividade recente" title="Criancas adicionadas">

            <div className="mt-6 space-y-3">
              {snapshot.recent_children.length > 0 ? (
                snapshot.recent_children.map((recentChild) => (
                  <AdminCard key={recentChild.child_id} className="rounded-2xl bg-slate-50 px-4 py-4 shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{recentChild.name}</p>
                      <p className="text-sm text-slate-500">{formatDateTime(recentChild.created_at)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Responsavel: {recentChild.owner_name} · {recentChild.age ? `${recentChild.age} anos` : "Idade nao informada"}
                    </p>
                  </AdminCard>
                ))
              ) : (
                <EmptyBlock message="Nenhuma crianca cadastrada ainda." />
              )}
            </div>
          </AdminSection>
        </div>

        <AdminSection eyebrow="Familias com mais uso" title="Top familias por volume">

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
        </AdminSection>

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

function getAlertTitle(alert: AdminAlertRecord) {
  switch (alert.id) {
    case "users_without_children":
      return "Usuarios sem criancas cadastradas";
    case "children_without_tasks":
      return "Criancas sem tarefas";
    case "periods_without_task_logs":
      return "Periodos sem registros";
    default:
      return "Alerta do sistema";
  }
}

function getAlertDescription(alert: AdminAlertRecord) {
  switch (alert.id) {
    case "users_without_children":
      return `${formatNumber(alert.count)} usuarios ainda nao configuraram nenhuma crianca e podem estar travados no onboarding.`;
    case "children_without_tasks":
      return `${formatNumber(alert.count)} criancas foram cadastradas, mas ainda nao receberam tarefas para uso recorrente.`;
    case "periods_without_task_logs":
      return `${formatNumber(alert.count)} periodos existem sem qualquer registro de tarefa, indicando risco de abandono ou setup incompleto.`;
    default:
      return `${formatNumber(alert.count)} ocorrencias exigem acompanhamento.`;
  }
}