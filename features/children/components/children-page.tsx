import Link from "next/link";
import { Button } from "@/components/button";
import type { Child } from "../types";

type ChildrenPageProps = {
  children: Child[];
  errorMessage?: string;
};

export function ChildrenPage({ children, errorMessage }: ChildrenPageProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-dark">Criancas</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Acompanhe a mesada da familia
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Visualize as criancas cadastradas e prepare o proximo passo do
            acompanhamento.
          </p>
        </div>

        <Button href="/children/new" className="w-full sm:w-auto">
          Adicionar novo filho
        </Button>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-3">
        {children.length > 0 ? (
          children.map((child) => (
            <Link
              key={child.id}
              href={`/children/${child.id}`}
              className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900">
                    {child.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {child.age ? `${child.age} anos` : "Idade nao informada"}
                  </p>
                </div>

                <div className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-dark">
                  {formatCurrency(child.base_allowance)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-600">
            Nenhuma crianca cadastrada ainda. Use o botao acima para adicionar o
            primeiro perfil.
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Proximas features: tarefas e periodos podem entrar em
        <Link href="/children/new" className="font-medium text-brand-dark">
          {" "}
          fluxos simples e separados
        </Link>
        .
      </p>
    </section>
  );
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value ?? 0);
}
