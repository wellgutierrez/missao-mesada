"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createChildAction } from "../actions/create-child";

export function NewChildForm() {
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
      const age = formData.age ? parseInt(formData.age) : null;
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

      const result = await createChildAction(formData.name, age, baseAllowance);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Erro ao criar criança");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Nome da criança *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: João, Maria..."
          className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="age" className="block text-sm font-medium text-slate-700">
          Idade (opcional)
        </label>
        <input
          id="age"
          type="number"
          min="0"
          max="18"
          value={formData.age}
          onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
          placeholder="Ex: 8, 12..."
          className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="baseAllowance" className="block text-sm font-medium text-slate-700">
          Mesada base (R$) *
        </label>
        <input
          id="baseAllowance"
          type="number"
          step="0.01"
          min="0"
          value={formData.baseAllowance}
          onChange={(e) => setFormData((prev) => ({ ...prev, baseAllowance: e.target.value }))}
          placeholder="Ex: 50.00, 100.00..."
          className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
          required
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-slate-500">
          Este valor será a base da mesada do primeiro período
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={isLoading}
          className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-full bg-brand-dark py-2 text-sm font-medium text-white hover:bg-brand-dark/90 disabled:opacity-60"
        >
          {isLoading ? "Criando..." : "Criar criança"}
        </button>
      </div>
    </form>
  );
}
