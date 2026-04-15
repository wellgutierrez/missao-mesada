import { NewChildForm } from "@/features/children/components/new-child-form";

export default function NewChildPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-brand-dark">Crianças</p>
        <h2 className="text-2xl font-semibold text-slate-900">Novo filho</h2>
        <p className="text-sm text-slate-600">
          Preencha os dados para adicionar uma nova criança ao sistema.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <NewChildForm />
      </div>

      <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <h3 className="font-semibold text-slate-900">O que acontecerá:</h3>
        <ul className="list-inside space-y-2 list-disc">
          <li>A criança será criada com os dados informados</li>
          <li>Automaticamente um período semanal será aberto</li>
          <li>Você poderá adicionar tarefas e registrar atividades</li>
          <li>Após configurar tudo, o primeiro período estará pronto para uso</li>
        </ul>
      </div>
    </section>
  );
}
