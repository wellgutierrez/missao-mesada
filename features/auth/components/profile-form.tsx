"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "@/features/auth/actions/update-profile";

type ProfileFormProps = {
  fullName: string;
  phone: string | null;
  email: string;
};

export function ProfileForm({ fullName, phone, email }: ProfileFormProps) {
  const [nameValue, setNameValue] = useState(fullName);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await updateProfileAction(nameValue, phoneValue);

      if (result.error) {
        setFeedback(result.error);
        return;
      }

      setFeedback("Perfil salvo com sucesso.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[28px] border border-app-line bg-white p-6 shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-primary">Responsavel</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-900">Perfil da familia</h1>
        <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
          Atualize os dados principais do responsavel. O email fica vinculado ao acesso da conta.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Nome completo</span>
          <input
            type="text"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            className="block w-full rounded-xl border border-app-line bg-white px-4 py-3 text-sm focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Celular</span>
          <input
            type="tel"
            value={phoneValue}
            onChange={(event) => setPhoneValue(event.target.value)}
            placeholder="(11) 99999-9999"
            className="block w-full rounded-xl border border-app-line bg-white px-4 py-3 text-sm focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Email de acesso</span>
        <input
          type="email"
          value={email}
          readOnly
          className="block w-full rounded-xl border border-app-line bg-slate-50 px-4 py-3 text-sm text-slate-500"
        />
      </label>

      {feedback ? (
        <p className="rounded-2xl border border-app-line bg-slate-50 px-4 py-3 text-sm text-slate-600">{feedback}</p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-app-primary px-5 text-sm font-bold text-white hover:bg-app-primary-dark disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}