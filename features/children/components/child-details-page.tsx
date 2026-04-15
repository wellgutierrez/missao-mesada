"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { addTaskLog, decrementTaskLog, getTaskLogsByPeriod, type TaskLogRow } from "@/features/tasks/data/task-logs";
import { calculateEndDate, closePeriod, createOpenPeriod, getClosedPeriodsByChild, getOpenPeriodByChild } from "@/features/children/data/periods";

import type { Child, AllowancePeriod, PeriodType } from "../types";
import type { Task } from "@/features/tasks/types";

type ChildDetailsPageProps = {
  child: Child;
  tasks: Task[];
};

type TaskCountMap = Record<string, number>;
type Tab = "tasks" | "registro" | "resumo";

export function ChildDetailsPage({ child, tasks }: ChildDetailsPageProps) {
  const [taskLogs, setTaskLogs] = useState<TaskLogRow[]>([]);
  const [historyLogs, setHistoryLogs] = useState<TaskLogRow[]>([]);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<AllowancePeriod | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [closedPeriods, setClosedPeriods] = useState<AllowancePeriod[]>([]);
  const [selectedHistoryPeriod, setSelectedHistoryPeriod] = useState<AllowancePeriod | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const router = useRouter();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [taskModalType, setTaskModalType] = useState<"bonus" | "discount">("bonus");
  const [taskForm, setTaskForm] = useState({ title: "", amount: 0 });
  const [rewardForm, setRewardForm] = useState({ reward_title: "", bonus_goal: 5 });
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingReward, setIsSavingReward] = useState(false);

  const currentLogs = selectedHistoryPeriod ? historyLogs : taskLogs;

  useEffect(() => {
    console.log("ChildDetailsPage state:", {
      activeTab,
      period: activePeriod,
      tasksLength: tasks.length,
      taskLogsLength: taskLogs.length,
      historyLogsLength: historyLogs.length,
      selectedHistoryPeriod
    });
  }, [activeTab, activePeriod, tasks.length, taskLogs.length, historyLogs.length, selectedHistoryPeriod]);
  const periodBaseAmount = activePeriod?.base_allowance ?? child.base_allowance ?? 0;

  const activeTasks = tasks.filter((task) => task.is_active ?? true);
  const bonusTasks = tasks.filter((task) => task.type === "bonus");
  const discountTasks = tasks.filter((task) => task.type === "discount");
  const activeBonusTasks = activeTasks.filter((task) => task.type === "bonus");
  const activeDiscountTasks = activeTasks.filter((task) => task.type === "discount");
  const otherTasks = tasks.filter((task) => task.type !== "bonus" && task.type !== "discount");

  const taskCounts: TaskCountMap = useMemo(() => {
    return currentLogs.reduce((counts, log) => {
      counts[log.task_id] = log.count;
      return counts;
    }, {} as TaskCountMap);
  }, [currentLogs]);

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
    setSelectedHistoryPeriod(null);
    setHistoryLogs([]);

    const period = await getOpenPeriodByChild(child.id);
    setActivePeriod(period);

    if (!period) {
      setTaskLogs([]);
      return;
    }

    const logs = await getTaskLogsByPeriod(child.id, period.id);
    setTaskLogs(logs);
  }

  async function refreshClosedPeriods() {
    const periods = await getClosedPeriodsByChild(child.id);
    setClosedPeriods(periods);
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
      await refreshClosedPeriods();
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
      return;
    }

    const confirmClose = window.confirm("Encerrar este período? Após o fechamento não será possível alterar tarefas.");
    if (!confirmClose) {
      return;
    }

    const success = await closePeriod(activePeriod.id);
    if (!success) {
      alert("Não foi possível encerrar o período.");
      return;
    }

    await refreshOpenPeriod();
    await refreshClosedPeriods();
  }

  async function handleSelectHistoryPeriod(period: AllowancePeriod) {
    setSelectedHistoryPeriod(period);
    const logs = await getTaskLogsByPeriod(child.id, period.id);
    setHistoryLogs(logs);
    setActiveTab("resumo");
  }

  useEffect(() => {
    refreshOpenPeriod();
    refreshClosedPeriods();
  }, [child.id]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-dark">Detalhes da criança</p>
              <h1 className="text-2xl font-semibold text-slate-900">{child.name}</h1>
            </div>
            <Link href="/" className="text-sm font-medium text-brand-dark underline">
              Voltar para lista
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Idade</p>
              <p className="text-base font-semibold text-slate-900">{child.age != null ? `${child.age} anos` : "Não informada"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Período</p>
              <p className="text-base font-semibold text-slate-900">{activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "Nenhum período aberto"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <p className="text-base font-semibold text-slate-900 capitalize">{activePeriod ? activePeriod.status : "fechado"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreatePeriod(true)}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Novo período
            </button>
            {activePeriod ? (
              <button
                type="button"
                onClick={handleClosePeriod}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
              >
                Encerrar período
              </button>
            ) : null}
          </div>

          {(loadError || periodError) && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">
              {loadError ?? periodError}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Resumo rápido</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Mesada base</p>
              <p className="text-xl font-semibold text-slate-900">{formatCurrency(periodBaseAmount)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Meta bônus</p>
              <p className="text-xl font-semibold text-slate-900">{activePeriod?.bonus_goal ?? "-"}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-slate-500">Total bônus</p>
              <p className="text-xl font-semibold text-emerald-700">{formatCurrency(totalBonus)}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-sm text-slate-500">Total descontos</p>
              <p className="text-xl font-semibold text-rose-700">{formatCurrency(totalDiscount)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Valor final</p>
            <p className="text-3xl font-semibold text-slate-900">{formatCurrency(finalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          {(["tasks", "registro", "resumo"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === tab ? "bg-brand text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {tab === "tasks" ? "Tarefas" : tab === "registro" ? "Registro" : "Resumo"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "tasks" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-3xl bg-slate-50 p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Configuração de tarefas</p>
                  <h3 className="text-xl font-semibold text-slate-900">Adicione e gerencie tarefas aqui</h3>
                  <p className="text-sm text-slate-500">Use os botões abaixo para criar bônus, descontos e definir recompensa.</p>
                </div>
                <div className="grid gap-2 sm:auto-cols-max sm:grid-flow-col">
                  <button
                    type="button"
                    onClick={() => handleOpenTaskModal("discount")}
                    className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
                  >
                    Adicionar desconto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTaskModal("bonus")}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                  >
                    Adicionar bônus
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenRewardModal}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                  >
                    {activePeriod?.reward_title ? "Editar recompensa" : "Adicionar recompensa"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Recompensa atual</p>
                    <p className="text-lg font-semibold text-slate-900">{activePeriod?.reward_title ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Meta de bônus</p>
                    <p className="text-lg font-semibold text-slate-900">{activePeriod?.bonus_goal ?? "—"} tarefas</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Progresso da recompensa</p>
                <p className="text-lg font-semibold text-slate-900">
                  {completedBonusCount} / {activePeriod?.bonus_goal ?? 0} tarefas bônus concluídas
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">Descontos</h3>
                  <div className="mt-4 space-y-3">
                    {discountTasks.length > 0 ? (
                      discountTasks.map((task) => {
                        const isActive = task.is_active ?? true;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-2xl bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{task.title}</p>
                                <p className="text-sm text-rose-700">{formatCurrency(task.amount)}</p>
                                <p className="text-xs font-medium text-slate-500">
                                  Status: {isActive ? "Ativa" : "Inativa"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskActive(task)}
                                  disabled={saving}
                                  className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
                                >
                                  {isActive ? "Desativar" : "Ativar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={saving}
                                  className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
                                >
                                  Excluir
                                </button>
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

                <section className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">Bônus</h3>
                  <div className="mt-4 space-y-3">
                    {bonusTasks.length > 0 ? (
                      bonusTasks.map((task) => {
                        const isActive = task.is_active ?? true;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-2xl bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{task.title}</p>
                                <p className="text-sm text-slate-500">{formatCurrency(task.amount)}</p>
                                <p className="text-xs font-medium text-slate-500">
                                  Status: {isActive ? "Ativa" : "Inativa"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskActive(task)}
                                  disabled={saving}
                                  className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
                                >
                                  {isActive ? "Desativar" : "Ativar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={saving}
                                  className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
                                >
                                  Excluir
                                </button>
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
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Período atual</p>
                <p className="text-base font-semibold text-slate-900">{activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "Nenhum período aberto"}</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">Descontos</h3>
                  <div className="mt-4 space-y-3">
                    {activeDiscountTasks.length > 0 ? (
                      activeDiscountTasks.map((task) => {
                        const count = taskCounts[task.id] ?? 0;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-2xl bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{task.title}</p>
                                <p className="text-sm text-rose-700">{formatCurrency(task.amount)}</p>
                                {count > 0 ? (
                                  <p className="text-xs text-slate-500">
                                    {count} × {formatCurrency(task.amount)} = {formatCurrency(task.amount * count)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddTask(task)}
                                  disabled={!activePeriod || saving}
                                  className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                >
                                  +
                                </button>
                                {count > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTask(task)}
                                    disabled={!activePeriod || saving}
                                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                  >
                                    -
                                  </button>
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

                <section className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">Bônus</h3>
                  <div className="mt-4 space-y-3">
                    {activeBonusTasks.length > 0 ? (
                      activeBonusTasks.map((task) => {
                        const count = taskCounts[task.id] ?? 0;
                        const saving = !!isSaving[task.id];
                        return (
                          <div key={task.id} className="rounded-2xl bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{task.title}</p>
                                <p className="text-sm text-slate-500">{formatCurrency(task.amount)}</p>
                                {count > 0 ? (
                                  <p className="text-xs text-slate-500">
                                    {count} × {formatCurrency(task.amount)} = {formatCurrency(task.amount * count)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddTask(task)}
                                  disabled={!activePeriod || saving}
                                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                >
                                  +
                                </button>
                                {count > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTask(task)}
                                    disabled={!activePeriod || saving}
                                    className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                  >
                                    -
                                  </button>
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
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Mesada base</p>
                  <p className="text-xl font-semibold text-slate-900">{formatCurrency(periodBaseAmount)}</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Total bônus</p>
                  <p className="text-xl font-semibold text-emerald-700">{formatCurrency(totalBonus)}</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Total descontos</p>
                  <p className="text-xl font-semibold text-rose-700">{formatCurrency(totalDiscount)}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Valor final</p>
                <p className="text-3xl font-semibold text-slate-900">{formatCurrency(finalAmount)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Meta de bônus</p>
                <p className="text-xl font-semibold text-slate-900">{selectedHistoryPeriod?.bonus_goal ?? activePeriod?.bonus_goal ?? "-"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Recompensa</p>
                <p className="text-xl font-semibold text-slate-900">{selectedHistoryPeriod?.reward_title ?? activePeriod?.reward_title ?? "Sem recompensa definida"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Status da recompensa</p>
                <p className="text-xl font-semibold text-slate-900">
                  {(selectedHistoryPeriod || activePeriod)
                    ? completedBonusCount >= ((selectedHistoryPeriod ?? activePeriod)?.bonus_goal ?? 0)
                      ? "Recompensa conquistada"
                      : "Ainda não conquistada"
                    : "-"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-dark">Histórico</p>
            <p className="text-sm text-slate-500">Períodos fechados da criança</p>
          </div>
        </div>

        {closedPeriods.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Ainda não há períodos encerrados.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {closedPeriods.map((period) => (
              <li key={period.id}>
                <button
                  type="button"
                  onClick={() => handleSelectHistoryPeriod(period)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{period.start_date} → {period.end_date}</p>
                      <p className="text-xs text-slate-500">Recompensa: {period.reward_title}</p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-dark">
                      {period.status}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  className="flex-1 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {isSavingTask ? "Salvando..." : "Salvar tarefa"}
                </button>
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
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingReward}
                  className="flex-1 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {isSavingReward ? "Salvando..." : "Salvar recompensa"}
                </button>
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
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 rounded-full bg-brand-dark py-2 text-sm font-medium text-white hover:bg-brand-dark/90 disabled:opacity-60"
            >
              {isCreating ? "Criando..." : "Criar período"}
            </button>
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
