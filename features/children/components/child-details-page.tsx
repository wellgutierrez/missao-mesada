"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { addTaskLog, decrementTaskLog, getTaskLogsByPeriod, type TaskLogRow } from "@/features/tasks/data/task-logs";
import { calculateEndDate, closePeriod, createOpenPeriod, getOpenPeriodByChild, getPeriodSummariesByChild } from "@/features/children/data/periods";

import type { Child, AllowancePeriod, PeriodType, PeriodSummary } from "../types";
import type { Task } from "@/features/tasks/types";

type ChildDetailsPageProps = {
  child: Child;
  tasks: Task[];
};

type TaskCountMap = Record<string, number>;
type Tab = "tasks" | "registro" | "resumo";

// Design System Components
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6 ${className}`}>
      {children}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  size = "default",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger" | "ghost";
  size?: "default" | "sm";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses = "inline-flex items-center justify-center rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
  const sizeClasses = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-3 text-sm";
  const variantClasses = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500",
    danger: "bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-500",
    ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500"
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({
  children,
  variant = "neutral"
}: {
  children: React.ReactNode;
  variant?: "success" | "error" | "neutral";
}) {
  const variantClasses = {
    success: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-800",
    neutral: "bg-slate-100 text-slate-700"
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}

export function ChildDetailsPage({ child, tasks }: ChildDetailsPageProps) {
  const [taskLogs, setTaskLogs] = useState<TaskLogRow[]>([]);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<AllowancePeriod | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [periodSummaries, setPeriodSummaries] = useState<PeriodSummary[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const router = useRouter();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [taskModalType, setTaskModalType] = useState<"bonus" | "discount">("bonus");
  const [taskForm, setTaskForm] = useState({ title: "", amount: 0 });
  const [rewardForm, setRewardForm] = useState({ reward_title: "", bonus_goal: 5 });
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingReward, setIsSavingReward] = useState(false);

  const periodBaseAmount = activePeriod?.base_allowance ?? child.base_allowance ?? 0;

  const activeTasks = tasks.filter((task) => task.is_active ?? true);
  const bonusTasks = tasks.filter((task) => task.type === "bonus");
  const discountTasks = tasks.filter((task) => task.type === "discount");
  const activeBonusTasks = activeTasks.filter((task) => task.type === "bonus");
  const activeDiscountTasks = activeTasks.filter((task) => task.type === "discount");

  const taskCounts: TaskCountMap = useMemo(() => {
    return taskLogs.reduce((counts, log) => {
      counts[log.task_id] = log.count;
      return counts;
    }, {} as TaskCountMap);
  }, [taskLogs]);

  const totalBonus = useMemo(
    () => bonusTasks.reduce((sum, task) => sum + (taskCounts[task.id] ?? 0) * task.amount, 0),
    [bonusTasks, taskCounts]
  );

  const completedBonusCount = useMemo(
    () => bonusTasks.reduce((sum, task) => sum + (taskCounts[task.id] ?? 0), 0),
    [bonusTasks, taskCounts]
  );

  const totalDiscount = useMemo(
    () => discountTasks.reduce((sum, task) => sum + (taskCounts[task.id] ?? 0) * task.amount, 0),
    [discountTasks, taskCounts]
  );

  const finalAmount = useMemo(
    () => periodBaseAmount + totalBonus - totalDiscount,
    [periodBaseAmount, totalBonus, totalDiscount]
  );

  async function refreshOpenPeriod() {
    setPeriodError(null);
    setLoadError(null);

    const period = await getOpenPeriodByChild(child.id);
    setActivePeriod(period);

    if (!period) {
      setTaskLogs([]);
      return;
    }

    const logs = await getTaskLogsByPeriod(child.id, period.id);
    setTaskLogs(logs);
  }

  async function refreshPeriodSummaries() {
    const summaries = await getPeriodSummariesByChild(child.id);
    setPeriodSummaries(summaries);
  }

  async function handleCreatePeriod(formData: {
    period_type: PeriodType;
    start_date: string;
    end_date: string;
    base_allowance: number;
    reward_title: string;
    bonus_goal: number;
  }) {
    setIsCreatingPeriod(true);
    setLoadError(null);
    setPeriodError(null);

    try {
      const period = await createOpenPeriod(
        child.id,
        formData.period_type,
        formData.start_date,
        formData.base_allowance,
        formData.reward_title,
        formData.bonus_goal
      );

      if (!period) {
        setPeriodError("Não foi possível criar o período. Verifique se já existe um período aberto.");
        return;
      }

      setShowCreatePeriod(false);
      await refreshOpenPeriod();
    } finally {
      setIsCreatingPeriod(false);
    }
  }

  async function handleAddTask(task: Task) {
    if (!activePeriod) {
      alert("Não é possível marcar tarefas sem um período aberto.");
      return;
    }

    setIsSaving((current) => ({
      ...current,
      [task.id]: true
    }));

    try {
      const created = await addTaskLog(child.id, activePeriod.id, task);
      if (!created) {
        alert("Não foi possível registrar a tarefa.");
        return;
      }

      const logs = await getTaskLogsByPeriod(child.id, activePeriod.id);
      setTaskLogs(logs);
    } finally {
      setIsSaving((current) => ({
        ...current,
        [task.id]: false
      }));
    }
  }

  async function handleRemoveTask(task: Task) {
    if (!activePeriod) {
      alert("Não é possível alterar tarefas sem um período aberto.");
      return;
    }

    const count = taskCounts[task.id] ?? 0;
    if (count <= 0) {
      return;
    }

    setIsSaving((current) => ({
      ...current,
      [task.id]: true
    }));

    try {
      const removed = await decrementTaskLog(child.id, activePeriod.id, task.id);
      if (!removed) {
        alert("Não foi possível remover o registro dessa tarefa.");
        return;
      }

      const logs = await getTaskLogsByPeriod(child.id, activePeriod.id);
      setTaskLogs(logs);
    } finally {
      setIsSaving((current) => ({
        ...current,
        [task.id]: false
      }));
    }
  }

  function hasOpenPeriodLogs(taskId: string) {
    if (!activePeriod) {
      return false;
    }

    return (taskLogs.find((log) => log.task_id === taskId)?.count ?? 0) > 0;
  }

  async function handleOpenTaskModal(type: "bonus" | "discount") {
    setTaskModalType(type);
    setTaskForm({ title: "", amount: 0 });
    setShowTaskModal(true);
  }

  async function handleSaveTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!child.id) {
      return;
    }

    setIsSavingTask(true);
    setLoadError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("tasks").insert([
        {
          child_id: child.id,
          title: taskForm.title,
          type: taskModalType,
          amount: taskForm.amount,
          is_active: true
        }
      ]);

      if (error) {
        setLoadError("Não foi possível salvar a tarefa.");
        return;
      }

      setShowTaskModal(false);
      await router.refresh();
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleToggleTaskActive(task: Task) {
    setLoadError(null);

    if (hasOpenPeriodLogs(task.id)) {
      setLoadError("Esta tarefa possui registros no período aberto e não pode ser desativada.");
      return;
    }

    setIsSaving((current) => ({
      ...current,
      [task.id]: true
    }));

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("tasks")
        .update({ is_active: !(task.is_active ?? true) })
        .eq("id", task.id);

      if (error) {
        setLoadError("Não foi possível alterar o status da tarefa.");
        return;
      }

      await router.refresh();
    } finally {
      setIsSaving((current) => ({
        ...current,
        [task.id]: false
      }));
    }
  }

  async function handleDeleteTask(taskId: string) {
    setLoadError(null);

    if (activePeriod && hasOpenPeriodLogs(taskId)) {
      setLoadError("Esta tarefa possui registros no período aberto e não pode ser excluída.");
      return;
    }

    const confirmDelete = window.confirm("Excluir esta tarefa? A ação não pode ser desfeita.");
    if (!confirmDelete) {
      return;
    }

    setIsSaving((current) => ({
      ...current,
      [taskId]: true
    }));

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) {
        setLoadError("Não foi possível excluir a tarefa.");
        return;
      }

      await router.refresh();
    } finally {
      setIsSaving((current) => ({
        ...current,
        [taskId]: false
      }));
    }
  }

  async function handleOpenRewardModal() {
    if (!activePeriod) {
      alert("Abra um período para definir a recompensa.");
      return;
    }

    setRewardForm({
      reward_title: activePeriod.reward_title ?? "",
      bonus_goal: activePeriod.bonus_goal ?? 5
    });
    setShowRewardModal(true);
  }

  async function handleSaveReward(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!activePeriod) {
      return;
    }

    setIsSavingReward(true);
    setLoadError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("allowance_periods")
        .update({
          reward_title: rewardForm.reward_title,
          bonus_goal: rewardForm.bonus_goal
        })
        .eq("id", activePeriod.id);

      if (error) {
        setLoadError("Não foi possível salvar a recompensa.");
        return;
      }

      setShowRewardModal(false);
      await refreshOpenPeriod();
      await router.refresh();
    } finally {
      setIsSavingReward(false);
    }
  }

  async function handleClosePeriod() {
    if (!activePeriod) {
      alert("Não há período aberto para encerrar.");
      return;
    }

    setShowCloseModal(true);
  }

  async function handleConfirmClosePeriod() {
    if (!activePeriod) {
      return;
    }

    const success = await closePeriod(
      activePeriod.id,
      child.id,
      periodBaseAmount,
      totalBonus,
      totalDiscount,
      finalAmount,
      activePeriod.bonus_goal ?? 0,
      completedBonusCount,
      activePeriod.reward_title,
      activePeriod.start_date,
      activePeriod.end_date ?? activePeriod.start_date
    );
    if (!success) {
      alert("Não foi possível encerrar o período.");
      return;
    }

    setShowCloseModal(false);
    await refreshOpenPeriod();
    await refreshPeriodSummaries();
  }

  useEffect(() => {
    refreshOpenPeriod();
    refreshPeriodSummaries();
  }, [child.id]);

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Detalhes da criança</p>
            <h1 className="text-5xl font-semibold tracking-tight text-slate-900">{child.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{child.age != null ? `${child.age} anos` : "Idade não informada"}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "Nenhum período aberto"}</span>
              <Badge variant={activePeriod ? "success" : "neutral"}>
                {activePeriod ? activePeriod.status : "Fechado"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap justify-start gap-3 sm:justify-end">
            <Button onClick={() => setShowCreatePeriod(true)}>
              Novo período
            </Button>
            {activePeriod ? (
              <Button variant="danger" onClick={handleClosePeriod}>
                Encerrar período
              </Button>
            ) : null}
          </div>
        </div>

        {(loadError || periodError) && (
          <div className="mt-6 rounded-[1.75rem] bg-amber-50 p-4 text-sm text-amber-700 shadow-sm ring-1 ring-amber-100">
            {loadError ?? periodError}
          </div>
        )}
      </Card>

      <Card>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="text-center">
            <p className="text-sm text-slate-500 uppercase tracking-[0.16em]">Mesada base</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{formatCurrency(periodBaseAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-500 uppercase tracking-[0.16em]">Meta bônus</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{activePeriod?.bonus_goal ?? "-"}</p>
          </div>
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.16em] text-emerald-700">Total bônus</p>
            <p className="mt-4 text-4xl font-semibold text-emerald-900">{formatCurrency(totalBonus)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.16em] text-rose-700">Total descontos</p>
            <p className="mt-4 text-4xl font-semibold text-rose-900">{formatCurrency(totalDiscount)}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] bg-slate-900 p-8 text-center text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Valor final</p>
          <p className="mt-4 text-6xl font-semibold">{formatCurrency(finalAmount)}</p>
        </div>
      </Card>

      <Card className="bg-yellow-50 ring-yellow-200">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">🎁 Recompensa</p>
            <h2 className="mt-3 text-4xl font-semibold text-slate-900">{activePeriod?.reward_title ?? "Nenhuma recompensa definida"}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Acompanhe o objetivo do período atual e incentive sua criança com metas claras para manter o progresso.</p>
          </div>
          <Badge variant={activePeriod && completedBonusCount >= (activePeriod.bonus_goal ?? 0) ? "success" : "error"}>
            {activePeriod
              ? completedBonusCount >= (activePeriod.bonus_goal ?? 0)
                ? "Conquistada"
                : "Em progresso"
              : "Não disponível"}
          </Badge>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-full bg-slate-100 p-2 shadow-inner shadow-slate-100">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Painel</p>
            <h2 className="text-xl font-semibold text-slate-900">Ações do período</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {(["tasks", "registro", "resumo"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-slate-900 text-white shadow"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab === "tasks" ? "Tarefas" : tab === "registro" ? "Registro" : "Resumo"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {activeTab === "tasks" ? (
            <div className="space-y-6">
              <Card className="bg-slate-50">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Painel de tarefas</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">Configurar e gerenciar</h3>
                    <p className="mt-2 text-sm text-slate-500">Crie descontos e bônus com facilidade, e ajuste a recompensa do período.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Button variant="primary" onClick={() => handleOpenTaskModal("bonus")}>
                      Adicionar bônus
                    </Button>
                    <Button variant="danger" onClick={() => handleOpenTaskModal("discount")}>
                      Adicionar desconto
                    </Button>
                    <Button variant="ghost" onClick={handleOpenRewardModal}>
                      {activePeriod?.reward_title ? "Editar recompensa" : "Adicionar recompensa"}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <Card>
                  <p className="text-sm text-slate-500">Recompensa atual</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{activePeriod?.reward_title ?? "Nenhuma recompensa definida"}</p>
                </Card>
                <Card className="bg-slate-50">
                  <p className="text-sm text-slate-500">Meta de bônus</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{activePeriod?.bonus_goal ?? "-"}</p>
                  <p className="mt-2 text-sm text-slate-500">tarefas necessárias</p>
                </Card>
              </div>

              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Progresso da recompensa</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">
                      {completedBonusCount} / {activePeriod?.bonus_goal ?? 0}
                    </p>
                  </div>
                  <Badge variant={activePeriod && completedBonusCount >= (activePeriod.bonus_goal ?? 0) ? "success" : "neutral"}>
                    {activePeriod && completedBonusCount >= (activePeriod.bonus_goal ?? 0) ? "Meta atingida" : "Em andamento"}
                  </Badge>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${activePeriod?.bonus_goal ? Math.min(100, (completedBonusCount / activePeriod.bonus_goal) * 100) : 0}%` }}
                  />
                </div>
              </Card>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-[1.75rem] bg-slate-50 p-6">
                  <h3 className="text-base font-semibold text-slate-900">Descontos</h3>
                  <div className="mt-4 space-y-3">
                    {discountTasks.length > 0 ? (
                      discountTasks.map((task) => {
                        const isActive = task.is_active ?? true;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{task.title}</p>
                                <p className="text-sm text-rose-700">{formatCurrency(task.amount)}</p>
                                <p className="text-xs font-medium text-slate-500">
                                  Status: {isActive ? "Ativa" : "Inativa"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleTaskActive(task)}
                                  disabled={saving}
                                >
                                  {isActive ? "Desativar" : "Ativar"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={saving}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">Nenhuma tarefa de desconto cadastrada.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.75rem] bg-slate-50 p-6">
                  <h3 className="text-base font-semibold text-slate-900">Bônus</h3>
                  <div className="mt-4 space-y-3">
                    {bonusTasks.length > 0 ? (
                      bonusTasks.map((task) => {
                        const isActive = task.is_active ?? true;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{task.title}</p>
                                <p className="text-sm text-slate-500">{formatCurrency(task.amount)}</p>
                                <p className="text-xs font-medium text-slate-500">
                                  Status: {isActive ? "Ativa" : "Inativa"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleTaskActive(task)}
                                  disabled={saving}
                                >
                                  {isActive ? "Desativar" : "Ativar"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={saving}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">Nenhuma tarefa de bônus cadastrada.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : activeTab === "registro" ? (
            <div className="space-y-5">
              <Card className="bg-slate-50">
                <p className="text-sm text-slate-500">Período atual</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "Nenhum período aberto"}</p>
              </Card>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Descontos</h3>
                      <p className="text-sm text-slate-500">Registre aplicações de desconto</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {activeDiscountTasks.length > 0 ? (
                      activeDiscountTasks.map((task) => {
                        const count = taskCounts[task.id] ?? 0;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-[1.75rem] bg-slate-50 p-5 shadow-sm ring-1 ring-slate-200">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-2">
                                <p className="font-semibold text-slate-900">{task.title}</p>
                                <p className="text-sm text-rose-700">{formatCurrency(task.amount)}</p>
                                {count > 0 ? (
                                  <p className="text-xs text-slate-500">
                                    {count} × {formatCurrency(task.amount)} = {formatCurrency(task.amount * count)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleAddTask(task)}
                                  disabled={!activePeriod || saving}
                                  className="min-w-10"
                                >
                                  +
                                </Button>
                                {count > 0 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveTask(task)}
                                    disabled={!activePeriod || saving}
                                    className="min-w-10"
                                  >
                                    -
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">Nenhuma tarefa de desconto cadastrada.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Bônus</h3>
                      <p className="text-sm text-slate-500">Registre tarefas bônus concluídas</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {activeBonusTasks.length > 0 ? (
                      activeBonusTasks.map((task) => {
                        const count = taskCounts[task.id] ?? 0;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-[1.75rem] bg-slate-50 p-5 shadow-sm ring-1 ring-slate-200">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-2">
                                <p className="font-semibold text-slate-900">{task.title}</p>
                                <p className="text-sm text-slate-600">{formatCurrency(task.amount)}</p>
                                {count > 0 ? (
                                  <p className="text-xs text-slate-500">
                                    {count} × {formatCurrency(task.amount)} = {formatCurrency(task.amount * count)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAddTask(task)}
                                  disabled={!activePeriod || saving}
                                  className="min-w-10"
                                >
                                  +
                                </Button>
                                {count > 0 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveTask(task)}
                                    disabled={!activePeriod || saving}
                                    className="min-w-10"
                                  >
                                    -
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">Nenhuma tarefa de bônus cadastrada.</p>
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <p className="text-sm text-slate-500">Mesada base</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(periodBaseAmount)}</p>
                </Card>
                <Card>
                  <p className="text-sm text-slate-500">Total bônus</p>
                  <p className="mt-3 text-2xl font-semibold text-emerald-700">{formatCurrency(totalBonus)}</p>
                </Card>
                <Card>
                  <p className="text-sm text-slate-500">Total descontos</p>
                  <p className="mt-3 text-2xl font-semibold text-rose-700">{formatCurrency(totalDiscount)}</p>
                </Card>
              </div>

              <Card className="bg-slate-900 text-white shadow-lg ring-slate-900">
                <p className="text-sm text-slate-300">Valor final</p>
                <p className="mt-3 text-4xl font-semibold">{formatCurrency(finalAmount)}</p>
              </Card>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[1.4fr_0.85fr]">
                <Card className="bg-slate-50">
                  <p className="text-sm text-slate-500">Vigência do período</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "-"}
                  </p>
                </Card>
                <Card>
                  <p className="text-sm text-slate-500">Meta de bônus</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{activePeriod?.bonus_goal ?? "-"}</p>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-emerald-50 ring-emerald-100">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Total bônus</p>
                  <p className="mt-3 text-3xl font-semibold text-emerald-900">{formatCurrency(totalBonus)}</p>
                </Card>
                <Card className="bg-rose-50 ring-rose-100">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-rose-700">Total descontos</p>
                  <p className="mt-3 text-3xl font-semibold text-rose-900">{formatCurrency(totalDiscount)}</p>
                </Card>
              </div>

              <Card className="bg-slate-900 text-white shadow-lg ring-slate-900">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Valor final</p>
                <p className="mt-4 text-5xl font-semibold">{formatCurrency(finalAmount)}</p>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <p className="text-sm text-slate-500">Bônus concluídos</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{completedBonusCount} / {activePeriod?.bonus_goal ?? 0}</p>
                </Card>
                <Card className="bg-slate-50">
                  <p className="text-sm text-slate-500">Recompensa</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{activePeriod?.reward_title ?? "Sem recompensa definida"}</p>
                  <div className="mt-4">
                    <Badge variant={activePeriod && completedBonusCount >= (activePeriod.bonus_goal ?? 0) ? "success" : "error"}>
                      {activePeriod
                        ? completedBonusCount >= (activePeriod.bonus_goal ?? 0)
                          ? "Conquistada"
                          : "Não conquistada"
                        : "Não disponível"}
                    </Badge>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Histórico</p>
            <p className="text-sm text-slate-500">Períodos encerrados da criança</p>
          </div>
        </div>

        {periodSummaries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Ainda não há períodos encerrados.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {periodSummaries.map((summary) => (
              <li key={summary.id}>
                <div className="w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{summary.started_at} → {summary.ended_at}</p>
                      <p className="text-xs text-slate-500">Recompensa: {summary.reward_title}</p>
                      <p className="text-xs text-slate-500">Valor final: {formatCurrency(summary.final_amount)}</p>
                      <p className="text-xs text-slate-500">Bônus: {summary.bonus_completed} / {summary.bonus_goal}</p>
                      <p className="text-xs text-slate-500">Status: {summary.reward_achieved ? "Conquistada" : "Não conquistada"}</p>
                    </div>
                    <Badge variant="neutral">Fechado</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>

      {showCloseModal && activePeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Encerrar período</h2>
              <p className="text-sm text-slate-500">Confirme o fechamento do período atual</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Período</p>
                <p className="text-base font-semibold text-slate-900">{activePeriod.start_date} → {activePeriod.end_date}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Mesada base</p>
                  <p className="text-xl font-semibold text-slate-900">{formatCurrency(periodBaseAmount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Meta bônus</p>
                  <p className="text-xl font-semibold text-slate-900">{activePeriod.bonus_goal}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-sm text-slate-500">Total bônus</p>
                  <p className="text-xl font-semibold text-emerald-700">{formatCurrency(totalBonus)}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4">
                  <p className="text-sm text-slate-500">Total descontos</p>
                  <p className="text-xl font-semibold text-rose-700">{formatCurrency(totalDiscount)}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Valor final</p>
                <p className="text-3xl font-semibold text-slate-900">{formatCurrency(finalAmount)}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Bônus concluídos</p>
                <p className="text-xl font-semibold text-slate-900">{completedBonusCount} / {activePeriod.bonus_goal}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Recompensa</p>
                <p className="text-xl font-semibold text-slate-900">{activePeriod.reward_title}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Status da recompensa</p>
                <p className="text-xl font-semibold text-slate-900">
                  {completedBonusCount >= (activePeriod.bonus_goal ?? 0) ? "Conquistada" : "Não conquistada"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCloseModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmClosePeriod}
                className="flex-1"
              >
                Encerrar período
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCreatePeriod && (
        <CreatePeriodModal
          child={child}
          onClose={() => setShowCreatePeriod(false)}
          onCreate={handleCreatePeriod}
          isCreating={isCreatingPeriod}
        />
      )}

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Adicionar {taskModalType === "bonus" ? "bônus" : "desconto"}
              </h2>
              <p className="text-sm text-slate-500">Crie uma tarefa nova para {child.name}</p>
            </div>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Título da tarefa</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taskForm.amount}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingTask}
                  className="flex-1 bg-brand hover:bg-brand-dark"
                >
                  {isSavingTask ? "Salvando..." : "Salvar tarefa"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Adicionar recompensa</h2>
              <p className="text-sm text-slate-500">Defina o título e a meta de bônus para o período atual</p>
            </div>
            <form onSubmit={handleSaveReward} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Título da recompensa</label>
                <input
                  type="text"
                  value={rewardForm.reward_title}
                  onChange={(e) => setRewardForm((prev) => ({ ...prev, reward_title: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Meta de bônus</label>
                <input
                  type="number"
                  min="1"
                  value={rewardForm.bonus_goal}
                  onChange={(e) => setRewardForm((prev) => ({ ...prev, bonus_goal: parseInt(e.target.value, 10) || 1 }))}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowRewardModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingReward}
                  className="flex-1 bg-brand hover:bg-brand-dark"
                >
                  {isSavingReward ? "Salvando..." : "Salvar recompensa"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

type CreatePeriodModalProps = {
  child: Child;
  onClose: () => void;
  onCreate: (formData: {
    period_type: PeriodType;
    start_date: string;
    end_date: string;
    base_allowance: number;
    reward_title: string;
    bonus_goal: number;
  }) => void;
  isCreating: boolean;
};

function CreatePeriodModal({ child, onClose, onCreate, isCreating }: CreatePeriodModalProps) {
  const initialStartDate = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    period_type: "weekly" as PeriodType,
    start_date: initialStartDate,
    end_date: calculateEndDate(initialStartDate, "weekly"),
    base_allowance: child.base_allowance || 0,
    reward_title: "",
    bonus_goal: 5
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onCreate(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateCalculatedEndDate = (nextStartDate: string, nextType: PeriodType) => {
    setFormData((prev) => ({
      ...prev,
      start_date: nextStartDate,
      end_date: calculateEndDate(nextStartDate, nextType)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Abrir novo período para {child.name}
          </h2>
          <p className="text-sm text-slate-500">Configure o período de mesada da criança</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tipo de período</label>
            <select
              value={formData.period_type}
              onChange={(e) => {
                const nextType = e.target.value as PeriodType;
                updateCalculatedEndDate(formData.start_date, nextType);
                handleInputChange("period_type", nextType);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
              disabled={isCreating}
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Data de início *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => updateCalculatedEndDate(e.target.value, formData.period_type)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
                required
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Data de fim</label>
              <input
                type="date"
                value={formData.end_date}
                readOnly
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Mesada base (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.base_allowance}
              onChange={(e) => handleInputChange("base_allowance", parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Título da recompensa *</label>
            <input
              type="text"
              value={formData.reward_title}
              onChange={(e) => handleInputChange("reward_title", e.target.value)}
              placeholder="Ex: Viagem para Disney, Novo videogame..."
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
              required
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Meta de bônus (tarefas) *</label>
            <input
              type="number"
              min="1"
              value={formData.bonus_goal}
              onChange={(e) => handleInputChange("bonus_goal", parseInt(e.target.value) || 1)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark"
              required
              disabled={isCreating}
            />
            <p className="mt-1 text-xs text-slate-500">Número de tarefas bônus que a criança precisa completar</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="flex-1 bg-brand-dark hover:bg-brand-dark/90"
            >
              {isCreating ? "Criando..." : "Criar período"}
            </Button>
          </div>
        </form>
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
