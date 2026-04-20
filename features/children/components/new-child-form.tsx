"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createChildAction } from "../actions/create-child";

type NewChildFormProps = {
  compact?: boolean;
};

export function NewChildForm({ compact = false }: NewChildFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    baseAllowance: ""
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const age = formData.age ? parseInt(formData.age, 10) : null;
      const baseAllowance = parseFloat(formData.baseAllowance) || 0;

      if (!formData.name.trim()) {
        setError("Nome é obrigatório");
        setIsLoading(false);
        return;
      }

      if (baseAllowance < 0) {
        setError("Mesada base não pode ser negativa");
        setIsLoading(false);
        return;
      }

      if (age == null || Number.isNaN(age)) {
        setError("Idade e obrigatoria");
        setIsLoading(false);
        return;
      }

      if (age < 4 || age > 18) {
        setError("A idade precisa estar entre 4 e 18 anos");
        setIsLoading(false);
        return;
      }

      const result = await createChildAction(formData.name, age, baseAllowance);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Erro ao criar criança");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-5" : "space-y-6"}>
      <div>
        <h2 className={compact ? "text-2xl font-extrabold tracking-[-0.03em] text-slate-900" : "text-3xl font-extrabold tracking-[-0.03em] text-slate-900"}>
          Nova Crianca
        </h2>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
          Nome da crianca
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: João, Maria..."
          className="mt-2 block w-full rounded-xl border border-app-line bg-white px-4 py-3 text-sm focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="age" className="block text-sm font-semibold text-slate-700">
          Idade da crianca
        </label>
        <input
          id="age"
          type="number"
          min="4"
          max="18"
          value={formData.age}
          onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
          placeholder="Ex: 4, 8, 12..."
          className="mt-2 block w-full rounded-xl border border-app-line bg-white px-4 py-3 text-sm focus:border-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary"
          required
          disabled={isLoading}
        />
        <p className="mt-2 text-xs italic text-slate-400">
          A idade e obrigatoria para liberar sugestoes por faixa etaria.
        </p>
      </div>

      <div>
        <label htmlFor="baseAllowance" className="block text-sm font-semibold text-slate-700">
          Valor da Mesada
        </label>
        <div className="mt-2 flex overflow-hidden rounded-xl border border-app-line bg-white">
          <span className="flex items-center border-r border-app-line px-4 text-sm font-semibold text-slate-500">R$</span>
          <input
            id="baseAllowance"
            type="number"
            step="0.01"
            min="0"
            value={formData.baseAllowance}
            onChange={(e) => setFormData((prev) => ({ ...prev, baseAllowance: e.target.value }))}
            placeholder="20.00"
            className="block w-full px-4 py-3 text-sm focus:outline-none"
            required
            disabled={isLoading}
          />
        </div>
        <p className="mt-2 text-xs italic text-slate-400">
          Este valor sera usado como referencia ao abrir o primeiro periodo.
        </p>
      </div>

      <div className="grid gap-3 pt-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={isLoading}
          className="rounded-xl bg-[#DDE6F2] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#D4DDEA] disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-app-primary px-4 py-3 text-sm font-bold text-white hover:bg-app-primary-dark disabled:opacity-60"
        >
          {isLoading ? "Criando..." : compact ? "Adicionar" : "Criar crianca"}
        </button>
      </div>
    </form>
  );
}
