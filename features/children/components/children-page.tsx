import Link from "next/link";
import { DashboardShell } from "@/features/children/components/dashboard-shell";
import type { Child } from "../types";

type ChildrenPageProps = {
  children: Child[];
  errorMessage?: string;
};

export function ChildrenPage({ children, errorMessage }: ChildrenPageProps) {
  const totalBase = children.reduce((sum, child) => sum + (child.base_allowance ?? 0), 0);

  return (
    <DashboardShell childList={children}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
          <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-primary">Painel da familia</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-slate-900">
              Acompanhe a mesada da familia em uma interface unica
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Selecione uma crianca na barra lateral para entrar no fluxo completo de registro, tarefas e resumo. A tela foi alinhada ao modelo do Bolt para preservar o visual aprovado.
            </p>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <OverviewCard label="Criancas cadastradas" value={String(children.length)} />
              <OverviewCard label="Mesada base somada" value={formatCurrency(totalBase)} />
              <OverviewCard label="Proximo passo" value={children.length > 0 ? "Abrir um perfil" : "Cadastrar a primeira crianca"} tone="primary" />
            </div>
          </section>

          <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Fluxo sugerido</p>
            <div className="mt-4 space-y-4">
              <FlowStep index="1" text="Cadastre a crianca com nome, idade e valor base da mesada." />
              <FlowStep index="2" text="Configure bonus, descontos e recompensa do periodo." />
              <FlowStep index="3" text="Use o resumo para fechar o periodo e consultar o historico." />
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Perfis cadastrados</h2>
              <p className="mt-2 text-sm text-slate-500">Cada perfil leva para o painel completo do acompanhamento.</p>
            </div>
            <Link
              href="/children/new"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-app-primary px-5 text-sm font-bold text-white hover:bg-app-primary-dark"
            >
              + Nova crianca
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {children.length > 0 ? (
              children.map((child) => (
                <Link
                  key={child.id}
                  href={`/children/${child.id}`}
                  className="rounded-[22px] border border-app-line bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-app-primary/50 hover:bg-app-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-extrabold tracking-[-0.03em] text-slate-900">{child.name}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {child.age ? `${child.age} anos` : "Idade nao informada"}
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-app-primary text-lg font-bold text-white">
                      {child.name.slice(0, 1).toUpperCase()}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mesada base</span>
                    <span className="text-lg font-extrabold text-app-primary">{formatCurrency(child.base_allowance)}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full rounded-[22px] border border-dashed border-app-line bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                Nenhuma crianca cadastrada ainda. Use a barra lateral para criar o primeiro perfil.
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function OverviewCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "primary";
}) {
  return (
    <div className={tone === "primary" ? "rounded-[22px] bg-app-primary px-5 py-5 text-white" : "rounded-[22px] border border-app-line bg-slate-50 px-5 py-5"}>
      <p className={tone === "primary" ? "text-xs font-bold uppercase tracking-[0.16em] text-white/70" : "text-xs font-bold uppercase tracking-[0.16em] text-slate-400"}>
        {label}
      </p>
      <p className="mt-3 text-2xl font-extrabold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function FlowStep({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-app-line bg-slate-50 px-4 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-app-primary text-sm font-bold text-white">{index}</div>
      <p className="text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value ?? 0);
}
