import { DashboardShell } from "@/features/children/components/dashboard-shell";
import { NewChildForm } from "@/features/children/components/new-child-form";
import { getChildren } from "@/features/children/data/get-children";

export default async function NewChildPage() {
  const { children } = await getChildren();

  return (
    <DashboardShell childList={children}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-app-line bg-slate-50 p-4">
              <NewChildForm compact />
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-app-primary">Nova crianca</p>
                <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-slate-900">
                  Monte o perfil inicial do acompanhamento
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                  Use a mesma estrutura da interface principal: crie a crianca, abra o primeiro periodo automaticamente e siga para o registro de tarefas e resumo.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-app-line bg-app-soft p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-primary">Fluxo</p>
                  <p className="mt-3 text-lg font-bold text-slate-900">Criacao imediata do primeiro periodo</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    A crianca entra pronta para uso, com periodo semanal inicial aberto automaticamente.
                  </p>
                </div>
                <div className="rounded-[24px] border border-app-line bg-white p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Depois disso</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                    <li>Registrar bonus e descontos</li>
                    <li>Definir recompensa do periodo</li>
                    <li>Acompanhar resumo e historico</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
