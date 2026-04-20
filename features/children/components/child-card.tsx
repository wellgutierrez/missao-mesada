"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteChildAction } from "@/features/children/actions/delete-child";
import type { Child } from "../types";

type ChildCardProps = {
  child: Child;
};

export function ChildCard({ child }: ChildCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const confirmDelete = window.confirm(
      `Excluir o perfil de ${child.name}? Todas as tarefas, periodos e historicos dessa crianca serao apagados.`
    );

    if (!confirmDelete) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await deleteChildAction(child.id);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      router.push(`/?deletedChild=${encodeURIComponent(child.name)}`);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-[22px] border border-app-line bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-app-primary/50 hover:bg-app-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-extrabold tracking-[-0.03em] text-slate-900">{child.name}</p>
          <p className="mt-2 text-sm text-slate-500">{child.age ? `${child.age} anos` : "Idade nao informada"}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-app-primary text-lg font-bold text-white">
          {child.name.slice(0, 1).toUpperCase()}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mesada base</span>
        <span className="text-lg font-extrabold text-app-primary">{formatCurrency(child.base_allowance)}</span>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/children/${child.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-app-primary px-4 text-sm font-semibold text-white hover:bg-app-primary-dark"
        >
          Abrir perfil
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </div>
  );
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value ?? 0);
}