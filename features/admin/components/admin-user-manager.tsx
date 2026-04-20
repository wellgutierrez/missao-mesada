"use client";

import { FormEvent, useState } from "react";
import { upsertAdminUserAction } from "@/features/admin/actions/upsert-admin-user";
import type { AdminRole, AdminUserRecord } from "@/features/admin/data/get-admin-dashboard";

type AdminUserManagerProps = {
  adminUsers: AdminUserRecord[];
  errorMessage?: string;
};

const ROLE_OPTIONS: AdminRole[] = ["owner", "manager", "viewer"];

export function AdminUserManager({ adminUsers, errorMessage }: AdminUserManagerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "manager" as AdminRole,
    note: ""
  });
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback({});

    try {
      const result = await upsertAdminUserAction(formData.email, formData.role, formData.note);

      if (result.error) {
        setFeedback({ error: result.error });
        return;
      }

      setFeedback({ success: "Administrador salvo com sucesso." });
      setFormData({ email: "", role: "manager", note: "" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Controle de acesso</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Cadastrar usuarios admin</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Esta area fica visivel apenas para owners. Use o email da conta ja cadastrada no app para liberar acesso administrativo.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      {feedback.error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {feedback.error}
        </div>
      ) : null}

      {feedback.success ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          {feedback.success}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <form onSubmit={handleSubmit} className="rounded-[24px] border border-app-line bg-slate-50 p-5" suppressHydrationWarning>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-primary">Novo acesso</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">Se o usuario ja estiver cadastrado, o papel sera atualizado.</p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Email do usuario</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                placeholder="usuario@email.com"
                suppressHydrationWarning
                className="block w-full rounded-xl border border-app-line bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary"
                required
                disabled={isSubmitting}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Papel administrativo</span>
              <select
                value={formData.role}
                onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value as AdminRole }))}
                suppressHydrationWarning
                className="block w-full rounded-xl border border-app-line bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary"
                disabled={isSubmitting}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Observacao</span>
              <textarea
                value={formData.note}
                onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ex.: acesso operacional, suporte, auditoria"
                suppressHydrationWarning
                className="min-h-28 w-full rounded-xl border border-app-line bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary"
                disabled={isSubmitting}
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-app-primary px-5 text-sm font-semibold text-white hover:bg-app-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Salvando..." : "Salvar administrador"}
            </button>
          </div>
        </form>

        <div className="rounded-[24px] border border-app-line bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Admins atuais</p>
          <div className="mt-4 space-y-3">
            {adminUsers.length > 0 ? (
              adminUsers.map((adminUser) => (
                <div key={adminUser.user_id} className="rounded-2xl border border-app-line bg-white px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{adminUser.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">ID {truncateId(adminUser.user_id)}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-app-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-app-primary">
                      {adminUser.role}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{adminUser.note || "Sem observacao."}</p>
                  <p className="mt-2 text-xs text-slate-400">Criado em {formatDateTime(adminUser.created_at)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-app-line bg-white px-5 py-8 text-center text-sm text-slate-500">
                Nenhum administrador adicional cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
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