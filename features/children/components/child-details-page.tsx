"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/features/children/components/dashboard-shell";
import { getAgeBasedSuggestions, getTaskSuggestionsByAge } from "@/features/children/data/age-based-suggestions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  addTaskLog,
  decrementTaskLog,
  getTaskLogsByPeriod,
  type TaskLogRow
} from "@/features/tasks/data/task-logs";
import {
  createTaskLogEvent,
  getTaskLogEventsByPeriod,
  type TaskHistoryEntry
} from "@/features/tasks/data/task-log-events";
import {
  calculateEndDate,
  closePeriod,
  createOpenPeriod,
  getOpenPeriodByChild,
  getPeriodSummariesByChild
} from "@/features/children/data/periods";

import type { Child, AllowancePeriod, PeriodType, PeriodSummary } from "../types";
import type { Task } from "@/features/tasks/types";

type ChildDetailsPageProps = {
  child: Child;
  tasks: Task[];
  childList: Child[];
};

type TaskCountMap = Record<string, number>;
type Tab = "registro" | "tasks" | "resumo";

const TASK_COLORS = [
  "#F54343",
  "#FF7A18",
  "#F4B400",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4"
];

const GUIDE_BLOCKS = [
  {
    title: "1. Defina tarefas simples",
    body: "Comece com poucas tarefas faceis de cumprir."
  },
  {
    title: "2. Use bonus como incentivo",
    body: "Valorize o esforco e a constancia, nao so o resultado."
  },
  {
    title: "3. Prefira experiencias ao inves de dinheiro ou brinquedos",
    body:
      "Quando a crianca atingir a meta de tarefas bonus, use a recompensa como um momento especial. Momentos juntos tem mais impacto.",
    examples: [
      "escolher o filme da familia",
      "fazer um passeio simples juntos",
      "deixar a crianca escolher o jantar",
      "brincar de algo que ela gosta"
    ]
  }
] as const;

const TAB_ITEMS = [
  { key: "registro", label: "Registro" },
  { key: "tasks", label: "Tarefas" },
  { key: "resumo", label: "Resumo" }
] as const satisfies ReadonlyArray<{ key: Tab; label: string }>;

export function ChildDetailsPage({ child, tasks, childList }: ChildDetailsPageProps) {
  const [taskLogs, setTaskLogs] = useState<TaskLogRow[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryEntry[]>([]);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<AllowancePeriod | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [periodSummaries, setPeriodSummaries] = useState<PeriodSummary[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("registro");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySummary, setSelectedHistorySummary] = useState<PeriodSummary | null>(null);
  const [taskModalType, setTaskModalType] = useState<"bonus" | "discount">("bonus");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    amount: 1,
    color: TASK_COLORS[4]
  });
  const [rewardForm, setRewardForm] = useState({ reward_title: "", bonus_goal: 5 });
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingReward, setIsSavingReward] = useState(false);
  const router = useRouter();
  const ageBasedSuggestions = useMemo(() => getAgeBasedSuggestions(child.age), [child.age]);
  const taskSuggestions = useMemo(
    () => getTaskSuggestionsByAge(child.age, taskModalType),
    [child.age, taskModalType]
  );
  const suggestionGroupLabel = ageBasedSuggestions?.ageGroup.label ?? "Idade nao informada";
  const rewardSuggestions = ageBasedSuggestions?.rewards ?? [];

  const periodBaseAmount = activePeriod?.base_allowance ?? child.base_allowance ?? 0;

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.is_active ?? true),
    [tasks]
  );
  const bonusTasks = useMemo(() => tasks.filter((task) => task.type === "bonus"), [tasks]);
  const discountTasks = useMemo(() => tasks.filter((task) => task.type === "discount"), [tasks]);
  const activeBonusTasks = useMemo(
    () => activeTasks.filter((task) => task.type === "bonus"),
    [activeTasks]
  );
  const activeDiscountTasks = useMemo(
    () => activeTasks.filter((task) => task.type === "discount"),
    [activeTasks]
  );

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
      setTaskHistory([]);
      return;
    }

    const [logs, history] = await Promise.all([
      getTaskLogsByPeriod(child.id, period.id),
      getTaskLogEventsByPeriod(child.id, period.id)
    ]);

    setTaskLogs(logs);
    setTaskHistory(history);
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
        setPeriodError("Nao foi possivel criar o periodo. Verifique se ja existe um periodo aberto.");
        return;
      }

      setShowCreatePeriod(false);
      await refreshOpenPeriod();
      await refreshPeriodSummaries();
    } finally {
      setIsCreatingPeriod(false);
    }
  }

  async function handleAddTask(task: Task) {
    if (!activePeriod) {
      setPeriodError("Abra um periodo antes de registrar tarefas.");
      return;
    }

    setIsSaving((current) => ({
      ...current,
      [task.id]: true
    }));

    try {
      const created = await addTaskLog(child.id, activePeriod.id, task);
      if (!created) {
        setLoadError("Nao foi possivel registrar a tarefa.");
        return;
      }

      const logs = await getTaskLogsByPeriod(child.id, activePeriod.id);
      setTaskLogs(logs);
      await createTaskLogEvent(child.id, activePeriod.id, task, "add");
      const history = await getTaskLogEventsByPeriod(child.id, activePeriod.id);
      setTaskHistory(history);
    } finally {
      setIsSaving((current) => ({
        ...current,
        [task.id]: false
      }));
    }
  }

  async function handleRemoveTask(task: Task) {
    if (!activePeriod) {
      setPeriodError("Nao ha periodo aberto para remover registros.");
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
        setLoadError("Nao foi possivel remover o registro dessa tarefa.");
        return;
      }

      const logs = await getTaskLogsByPeriod(child.id, activePeriod.id);
      setTaskLogs(logs);
      await createTaskLogEvent(child.id, activePeriod.id, task, "remove");
      const history = await getTaskLogEventsByPeriod(child.id, activePeriod.id);
      setTaskHistory(history);
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

  function handleOpenTaskModal(type: "bonus" | "discount") {
    setTaskModalType(type);
    setTaskForm({ title: "", description: "", amount: 1, color: TASK_COLORS[4] });
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
        setLoadError("Nao foi possivel salvar a tarefa.");
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
      setLoadError("Esta tarefa possui registros no periodo aberto e nao pode ser desativada.");
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
        setLoadError("Nao foi possivel alterar o status da tarefa.");
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
      setLoadError("Esta tarefa possui registros no periodo aberto e nao pode ser excluida.");
      return;
    }

    const confirmDelete = window.confirm("Excluir esta tarefa? A acao nao pode ser desfeita.");
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
        setLoadError("Nao foi possivel excluir a tarefa.");
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

  function handleOpenRewardModal() {
    if (!activePeriod) {
      setPeriodError("Abra um periodo para definir a recompensa.");
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
        setLoadError("Nao foi possivel salvar a recompensa.");
        return;
      }

      setShowRewardModal(false);
      await refreshOpenPeriod();
      await router.refresh();
    } finally {
      setIsSavingReward(false);
    }
  }

  function handleClosePeriod() {
    if (!activePeriod) {
      setPeriodError("Nao ha periodo aberto para encerrar.");
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
      setLoadError("Nao foi possivel encerrar o periodo.");
      return;
    }

    setShowCloseModal(false);
    await refreshOpenPeriod();
    await refreshPeriodSummaries();
    setShowCreatePeriod(true);
  }

  useEffect(() => {
    void refreshOpenPeriod();
    void refreshPeriodSummaries();
  }, [child.id]);

  const rewardAchieved =
    activePeriod != null && completedBonusCount >= (activePeriod.bonus_goal ?? 0);

  return (
    <DashboardShell
      childList={childList}
      selectedChildId={child.id}
      guideTitle="Como usar o Missao Mesada com seu filho"
      guideIntro="As tarefas e recompensas sugeridas no app sao baseadas na faixa etaria da crianca, para ajudar no desenvolvimento de responsabilidade, autonomia e vinculo com os pais."
      guideBlocks={[...GUIDE_BLOCKS]}
    >
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="overflow-hidden rounded-[28px] border border-app-line bg-white shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]">
          <div className="border-b border-app-line px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 md:justify-between">
              {TAB_ITEMS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "relative min-w-[150px] border-b-4 px-2 py-4 text-center text-sm font-semibold transition",
                    activeTab === tab.key
                      ? "border-app-primary text-app-primary"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            {loadError || periodError ? (
              <div className="rounded-2xl border-l-4 border-app-primary bg-app-soft px-4 py-4 text-sm text-slate-700">
                {loadError ?? periodError}
              </div>
            ) : null}

            {activeTab === "registro" ? (
              <RegistroTab
                activePeriod={activePeriod}
                periodBaseAmount={periodBaseAmount}
                totalBonus={totalBonus}
                totalDiscount={totalDiscount}
                finalAmount={finalAmount}
                activeDiscountTasks={activeDiscountTasks}
                activeBonusTasks={activeBonusTasks}
                taskCounts={taskCounts}
                isSaving={isSaving}
                onAddTask={handleAddTask}
                onRemoveTask={handleRemoveTask}
                onOpenCreatePeriod={() => setShowCreatePeriod(true)}
              />
            ) : null}

            {activeTab === "tasks" ? (
              <TasksTab
                activePeriod={activePeriod}
                rewardAchieved={rewardAchieved}
                completedBonusCount={completedBonusCount}
                bonusTasks={bonusTasks}
                discountTasks={discountTasks}
                isSaving={isSaving}
                taskCounts={taskCounts}
                onOpenTaskModal={handleOpenTaskModal}
                onOpenRewardModal={handleOpenRewardModal}
                onToggleTaskActive={handleToggleTaskActive}
                onDeleteTask={handleDeleteTask}
              />
            ) : null}

            {activeTab === "resumo" ? (
              <ResumoTab
                activePeriod={activePeriod}
                periodBaseAmount={periodBaseAmount}
                totalBonus={totalBonus}
                totalDiscount={totalDiscount}
                finalAmount={finalAmount}
                completedBonusCount={completedBonusCount}
                rewardAchieved={rewardAchieved}
                taskHistory={taskHistory}
                onOpenHistory={() => setShowHistoryModal(true)}
                onClosePeriod={handleClosePeriod}
                onOpenCreatePeriod={() => setShowCreatePeriod(true)}
              />
            ) : null}
          </div>
        </div>
      </div>

      {showCloseModal && activePeriod ? (
        <ModalFrame maxWidth="max-w-3xl">
          <div className="space-y-6">
            <div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-app-primary">
                Resumo de Fechamento
              </h2>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <SummaryLine label="Periodo:" value={formatDateRange(activePeriod.start_date, activePeriod.end_date)} />
              <SummaryLine label="Mesada Base:" value={formatCurrency(periodBaseAmount)} />
              <SummaryLine label="Total de Bonus:" value={formatSignedCurrency(totalBonus, true)} valueClassName="text-emerald-500" extraValue={`(${completedBonusCount})`} />
              <SummaryLine label="Total de Descontos:" value={formatSignedCurrency(totalDiscount, false)} valueClassName="text-rose-500" extraValue={`(${getAppliedCount(discountTasks, taskCounts)})`} />
              <div className="my-3 border-t border-app-line" />
              <SummaryLine label="Total a Receber:" value={formatCurrency(finalAmount)} valueClassName="text-[18px] font-extrabold text-app-primary" />
              <div className="mt-6 border-t border-app-line pt-6">
                <p className="text-[18px] font-extrabold uppercase tracking-[-0.02em] text-slate-900">Recompensa do Periodo:</p>
                <div className="mt-4 rounded-2xl border border-[#FFD86C] bg-[#FFF8D8] px-4 py-4 text-lg font-semibold text-[#9A5313]">
                  {activePeriod.reward_title || "Sem recompensa definida"}
                </div>
                <p className="mt-3 text-sm text-slate-500">Configure a recompensa na aba de Tarefas.</p>
              </div>
            </div>

            <p className="text-center text-lg leading-8 text-slate-500">
              Este periodo sera salvo no historico. Configure o proximo periodo para continuar acompanhando as tarefas.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton variant="secondary" onClick={() => setShowCloseModal(false)}>
                Cancelar
              </ActionButton>
              <ActionButton variant="success" onClick={handleConfirmClosePeriod}>
                Confirmar e configurar proximo periodo
              </ActionButton>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {showCreatePeriod ? (
        <CreatePeriodModal
          child={child}
          rewardSuggestions={rewardSuggestions}
          suggestionGroupLabel={suggestionGroupLabel}
          onClose={() => setShowCreatePeriod(false)}
          onCreate={handleCreatePeriod}
          isCreating={isCreatingPeriod}
        />
      ) : null}

      {showTaskModal ? (
        <ModalFrame maxWidth="max-w-2xl">
          <form onSubmit={handleSaveTask} className="space-y-6">
            <div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-app-primary">
                {taskModalType === "bonus" ? "Adicionar Tarefa Bonus" : "Adicionar Tarefa Desconto"}
              </h2>
            </div>

            <FieldBlock label="Titulo">
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Fazer licao de casa"
                className="field-input"
                required
              />
            </FieldBlock>

            <div className="rounded-[18px] bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Sugestoes:</p>
              <p className="mt-1 text-xs text-slate-400">Faixa etaria: {suggestionGroupLabel}</p>
              <div className="mt-3 space-y-2">
                {taskSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTaskForm((prev) => ({ ...prev, title: suggestion }))}
                    className="flex w-full items-center justify-center rounded-xl border border-app-line bg-white px-4 py-2 text-sm font-medium text-app-primary hover:bg-app-soft"
                  >
                    {suggestion}
                  </button>
                ))}
                {taskSuggestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-app-line bg-white px-4 py-3 text-sm text-slate-500">
                    Cadastre ou corrija a idade da crianca para liberar as sugestoes por faixa etaria.
                  </div>
                ) : null}
              </div>
            </div>

            <FieldBlock label="Descricao (opcional)">
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes adicionais..."
                className="field-input min-h-[120px] resize-none"
              />
            </FieldBlock>

            <FieldBlock label="Valor">
              <div className="flex overflow-hidden rounded-xl border border-app-line bg-white">
                <span className="flex items-center border-r border-app-line px-4 text-lg font-semibold text-slate-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taskForm.amount}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-3 text-lg outline-none"
                  required
                />
              </div>
            </FieldBlock>

            <div>
              <p className="text-lg font-semibold text-slate-900">Cor</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {TASK_COLORS.map((color) => {
                  const isSelected = taskForm.color === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTaskForm((prev) => ({ ...prev, color }))}
                      className={[
                        "h-10 w-10 rounded-xl border-2 transition",
                        isSelected ? "border-slate-900 ring-2 ring-slate-300" : "border-transparent"
                      ].join(" ")}
                      style={{ backgroundColor: color }}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton type="submit" disabled={isSavingTask}>
                {isSavingTask ? "Salvando..." : "Adicionar Tarefa"}
              </ActionButton>
              <ActionButton type="button" variant="secondary" onClick={() => setShowTaskModal(false)}>
                Cancelar
              </ActionButton>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {showRewardModal ? (
        <ModalFrame maxWidth="max-w-2xl">
          <form onSubmit={handleSaveReward} className="space-y-6">
            <div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-app-primary">
                Definir Recompensa do Periodo
              </h2>
            </div>

            <FieldBlock label="Recompensa">
              <input
                type="text"
                value={rewardForm.reward_title}
                onChange={(e) => setRewardForm((prev) => ({ ...prev, reward_title: e.target.value }))}
                className="field-input"
                required
              />
            </FieldBlock>

            <div className="rounded-[18px] bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Sugestoes de recompensa:</p>
              <p className="mt-1 text-xs text-slate-400">Faixa etaria: {suggestionGroupLabel}</p>
              <div className="mt-3 space-y-2">
                {rewardSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setRewardForm((prev) => ({ ...prev, reward_title: suggestion }))}
                    className="flex w-full items-center justify-center rounded-xl border border-app-line bg-white px-4 py-2 text-sm font-medium text-app-primary hover:bg-app-soft"
                  >
                    {suggestion}
                  </button>
                ))}
                {rewardSuggestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-app-line bg-white px-4 py-3 text-sm text-slate-500">
                    Cadastre ou corrija a idade da crianca para liberar as sugestoes por faixa etaria.
                  </div>
                ) : null}
              </div>
            </div>

            <FieldBlock label="Meta de bonus">
              <input
                type="number"
                min="1"
                value={rewardForm.bonus_goal}
                onChange={(e) => setRewardForm((prev) => ({ ...prev, bonus_goal: parseInt(e.target.value, 10) || 1 }))}
                className="field-input"
                required
              />
            </FieldBlock>

            <p className="text-sm leading-7 text-emerald-700">
              Baseado na idade da crianca ({child.age ?? "?"} anos). Esta recompensa sera dada pelo cumprimento das tarefas bonus.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton type="submit" disabled={isSavingReward}>
                {isSavingReward ? "Salvando..." : "Salvar Recompensa"}
              </ActionButton>
              <ActionButton type="button" variant="secondary" onClick={() => setShowRewardModal(false)}>
                Cancelar
              </ActionButton>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {showHistoryModal ? (
        <ModalFrame maxWidth="max-w-2xl">
          {selectedHistorySummary ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-app-primary">
                  Detalhes do Periodo
                </h2>
              </div>

              <div className="rounded-2xl bg-[#7D91B0] px-4 py-3 text-center text-xl font-extrabold text-white">
                {selectedHistorySummary.reward_achieved ? "CONQUISTOU" : "NAO CONQUISTOU"}
              </div>

              <div className="rounded-[24px] bg-slate-50 p-5">
                <SummaryLine label="Periodo:" value={formatDateRange(selectedHistorySummary.started_at, selectedHistorySummary.ended_at)} />
                <SummaryLine label="Mesada Base:" value={formatCurrency(selectedHistorySummary.base_allowance)} />
                <SummaryLine label="Tarefas Bonus:" value={`${selectedHistorySummary.bonus_completed} / ${selectedHistorySummary.bonus_goal}`} />
                <SummaryLine label={`Bonus Total (${selectedHistorySummary.bonus_completed}):`} value={formatSignedCurrency(selectedHistorySummary.total_bonus, true)} valueClassName="text-emerald-500" />
                <SummaryLine label="Descontos Total:" value={formatSignedCurrency(selectedHistorySummary.total_discount, false)} valueClassName="text-rose-500" />
                <SummaryLine label="Total a Receber:" value={formatCurrency(selectedHistorySummary.final_amount)} valueClassName="font-extrabold text-slate-900" />
                <div className="mt-4 rounded-2xl border border-[#FFD86C] bg-[#FFF8D8] px-4 py-3 text-sm font-semibold text-[#B55C16]">
                  RECOMPENSA: <span className="ml-2">{selectedHistorySummary.reward_title}</span>
                </div>
                <SummaryLine label="Data de Fechamento:" value={formatDateTime(selectedHistorySummary.created_at)} className="border-b-0 pt-4" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionButton type="button" variant="secondary" onClick={() => setSelectedHistorySummary(null)}>
                  Voltar
                </ActionButton>
                <ActionButton type="button" variant="secondary" onClick={() => setShowHistoryModal(false)}>
                  Fechar
                </ActionButton>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-app-primary">
                  Historico de Periodos
                </h2>
              </div>

              <div className="space-y-3">
                {periodSummaries.length > 0 ? (
                  periodSummaries.map((summary) => (
                    <button
                      key={summary.id}
                      type="button"
                      onClick={() => setSelectedHistorySummary(summary)}
                      className="flex w-full items-center justify-between rounded-xl border border-app-line bg-slate-50 px-4 py-4 text-left hover:bg-app-soft"
                    >
                      <span className="text-lg font-semibold text-slate-900">
                        {formatDateRange(summary.started_at, summary.ended_at)}
                      </span>
                      <span className="text-2xl font-extrabold text-app-primary">
                        {formatCurrency(summary.final_amount)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-app-line bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Ainda nao ha periodos encerrados.
                  </div>
                )}
              </div>

              <ActionButton type="button" variant="secondary" onClick={() => setShowHistoryModal(false)}>
                Fechar
              </ActionButton>
            </div>
          )}
        </ModalFrame>
      ) : null}
    </DashboardShell>
  );
}

function RegistroTab({
  activePeriod,
  periodBaseAmount,
  totalBonus,
  totalDiscount,
  finalAmount,
  activeDiscountTasks,
  activeBonusTasks,
  taskCounts,
  isSaving,
  onAddTask,
  onRemoveTask,
  onOpenCreatePeriod
}: {
  activePeriod: AllowancePeriod | null;
  periodBaseAmount: number;
  totalBonus: number;
  totalDiscount: number;
  finalAmount: number;
  activeDiscountTasks: Task[];
  activeBonusTasks: Task[];
  taskCounts: TaskCountMap;
  isSaving: Record<string, boolean>;
  onAddTask: (task: Task) => void;
  onRemoveTask: (task: Task) => void;
  onOpenCreatePeriod: () => void;
}) {
  if (!activePeriod) {
    return <EmptyPeriodState onOpenCreatePeriod={onOpenCreatePeriod} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-line bg-white px-4 py-4 text-sm font-semibold text-slate-500">
        <span className="mr-4 text-app-primary">PERIODO {getPeriodTypeLabel(activePeriod.period_type).toUpperCase()}</span>
        <span>{formatDateRange(activePeriod.start_date, activePeriod.end_date)}</span>
      </div>

      <div className="rounded-2xl border-l-4 border-app-primary bg-app-soft px-4 py-4 text-sm text-slate-600">
        Registre as ocorrencias das tarefas durante o periodo. O total da mesada e atualizado automaticamente.
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Mesada Base:" value={formatCurrency(periodBaseAmount)} />
        <MetricCard label="Descontos:" value={formatSignedCurrency(totalDiscount, false)} tone="danger" />
        <MetricCard label="Bonus:" value={formatSignedCurrency(totalBonus, true)} tone="success" />
        <MetricCard label="Total do Periodo:" value={formatCurrency(finalAmount)} tone="primary" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TaskRegisterColumn
          title="Descontos"
          tasks={activeDiscountTasks}
          taskCounts={taskCounts}
          isSaving={isSaving}
          tone="danger"
          onAddTask={onAddTask}
          onRemoveTask={onRemoveTask}
        />
        <TaskRegisterColumn
          title="Bonus"
          tasks={activeBonusTasks}
          taskCounts={taskCounts}
          isSaving={isSaving}
          tone="success"
          onAddTask={onAddTask}
          onRemoveTask={onRemoveTask}
        />
      </div>
    </div>
  );
}

function TasksTab({
  activePeriod,
  rewardAchieved,
  completedBonusCount,
  bonusTasks,
  discountTasks,
  isSaving,
  taskCounts,
  onOpenTaskModal,
  onOpenRewardModal,
  onToggleTaskActive,
  onDeleteTask
}: {
  activePeriod: AllowancePeriod | null;
  rewardAchieved: boolean;
  completedBonusCount: number;
  bonusTasks: Task[];
  discountTasks: Task[];
  isSaving: Record<string, boolean>;
  taskCounts: TaskCountMap;
  onOpenTaskModal: (type: "bonus" | "discount") => void;
  onOpenRewardModal: () => void;
  onToggleTaskActive: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <ActionButton variant="danger" onClick={() => onOpenTaskModal("discount")} className="w-auto px-5">
          + Adicionar Tarefa Desconto
        </ActionButton>
        <ActionButton variant="success" onClick={() => onOpenTaskModal("bonus")} className="w-auto px-5">
          + Adicionar Tarefa Bonus
        </ActionButton>
        <ActionButton variant="warning" onClick={onOpenRewardModal} className="w-auto px-5">
          Editar Recompensa
        </ActionButton>
      </div>

      <div className="rounded-[22px] border border-[#FFD86C] bg-[#FFF8D8] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-extrabold tracking-[-0.02em] text-[#C46710]">
              Recompensa do Periodo
            </p>
            <div className="mt-4 rounded-2xl border border-[#FFE7A8] bg-white/70 px-5 py-4 text-lg font-semibold text-[#915019]">
              {activePeriod?.reward_title || "Defina uma recompensa para este periodo"}
            </div>
            <p className="mt-3 text-sm text-[#8F6A1B]">
              Meta atual: {completedBonusCount} / {activePeriod?.bonus_goal ?? 0} tarefas bonus {rewardAchieved ? "atingida" : "em andamento"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenRewardModal}
            className="rounded-xl border border-[#FFD86C] bg-[#FFECA8] px-3 py-2 text-sm font-semibold text-[#C46710]"
          >
            /
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TaskManagerColumn
          title="Descontos"
          tasks={discountTasks}
          isSaving={isSaving}
          taskCounts={taskCounts}
          amountTone="danger"
          onToggleTaskActive={onToggleTaskActive}
          onDeleteTask={onDeleteTask}
        />
        <TaskManagerColumn
          title="Bonus"
          tasks={bonusTasks}
          isSaving={isSaving}
          taskCounts={taskCounts}
          amountTone="success"
          onToggleTaskActive={onToggleTaskActive}
          onDeleteTask={onDeleteTask}
        />
      </div>
    </div>
  );
}

function ResumoTab({
  activePeriod,
  periodBaseAmount,
  totalBonus,
  totalDiscount,
  finalAmount,
  completedBonusCount,
  rewardAchieved,
  taskHistory,
  onOpenHistory,
  onClosePeriod,
  onOpenCreatePeriod
}: {
  activePeriod: AllowancePeriod | null;
  periodBaseAmount: number;
  totalBonus: number;
  totalDiscount: number;
  finalAmount: number;
  completedBonusCount: number;
  rewardAchieved: boolean;
  taskHistory: TaskHistoryEntry[];
  onOpenHistory: () => void;
  onClosePeriod: () => void;
  onOpenCreatePeriod: () => void;
}) {
  const [isTaskHistoryOpen, setIsTaskHistoryOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-slate-900">Resumo Periodo</h2>
        <div className="flex flex-wrap gap-3">
          <ActionButton variant="secondary" onClick={onOpenHistory} className="w-auto px-5">
            Historico de Periodos
          </ActionButton>
          {activePeriod ? (
            <ActionButton variant="warning" onClick={onClosePeriod} className="w-auto px-5">
              Encerrar periodo
            </ActionButton>
          ) : (
            <ActionButton onClick={onOpenCreatePeriod} className="w-auto px-5">
              Abrir periodo
            </ActionButton>
          )}
        </div>
      </div>

      {rewardAchieved ? (
        <div className="rounded-2xl border border-app-line bg-white px-5 py-4 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)]">
          <div className="flex items-start gap-3">
            <span className="pt-0.5 text-amber-400">*</span>
            <div>
              <p className="text-sm font-semibold text-slate-700">Dica</p>
              <p className="mt-1 text-sm leading-7 text-slate-500">
                Seu filho atingiu a meta de bonus. Aproveite esse momento com ele. Prefira experiencias ao inves de dinheiro ou brinquedos.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {activePeriod ? (
        <div className="rounded-[22px] border-2 border-emerald-400 bg-white p-4">
          <div className="flex items-center justify-between gap-3 border-b border-app-line pb-4">
            <p className="text-lg font-semibold text-slate-500">
              {formatDateRange(activePeriod.start_date, activePeriod.end_date)}
            </p>
            <span className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white">
              Periodo Vigente
            </span>
          </div>

          <div className="space-y-3 py-4">
            <SummaryBar label="Mesada Base:" value={formatCurrency(periodBaseAmount)} />
            <SummaryBar label="Descontos:" value={formatSignedCurrency(totalDiscount, false)} valueClassName="text-rose-500" />
            <SummaryBar label="Bonus:" value={formatSignedCurrency(totalBonus, true)} valueClassName="text-emerald-500" />
            <SummaryBar label="Tarefas Bonus Completadas:" value={`${completedBonusCount} / ${activePeriod.bonus_goal ?? 0}`} />
          </div>

          <div className="rounded-2xl border border-[#FFD86C] bg-[#FFF8D8] px-4 py-4 text-sm font-semibold uppercase tracking-[0.05em] text-[#C46710]">
            Recompensa:
            <span className="ml-3 normal-case tracking-normal text-[#A25B1C]">
              {activePeriod.reward_title || "Sem recompensa definida"}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-[#E6F1FF] px-4 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Total do Periodo:</p>
                <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-app-primary">
                  {formatCurrency(finalAmount)}
                </p>
              </div>

              {rewardAchieved ? (
                <div className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-sm font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_16px_30px_-20px_rgba(245,158,11,0.9)]">
                  Conquistou Recompensa!
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => setIsTaskHistoryOpen((current) => !current)}
              className="flex w-full items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700"
            >
              <span className="text-sm text-slate-600">
                {isTaskHistoryOpen ? "▼" : "▶"}
              </span>
              <span>Ver Historico</span>
            </button>

            {isTaskHistoryOpen ? (
              <div className="border-t border-app-line pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                    Historico de marcacoes
                  </p>
                  <button
                    type="button"
                    onClick={onOpenHistory}
                    className="text-sm font-semibold text-app-primary hover:text-app-primary-dark"
                  >
                    Historico de periodos
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {taskHistory.length > 0 ? (
                    taskHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-800">
                            {entry.taskTitle}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </div>
                        <p
                          className={entry.taskType === "bonus" ? "text-lg font-extrabold text-emerald-500" : "text-lg font-extrabold text-rose-500"}
                        >
                          {formatSignedCurrencyByAction(entry.action, entry.taskType, entry.taskAmount)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-app-line bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Nenhuma tarefa foi marcada neste periodo ainda.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyPeriodState onOpenCreatePeriod={onOpenCreatePeriod} />
      )}
    </div>
  );
}

type CreatePeriodModalProps = {
  child: Child;
  rewardSuggestions: string[];
  suggestionGroupLabel: string;
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

function CreatePeriodModal({
  child,
  rewardSuggestions,
  suggestionGroupLabel,
  onClose,
  onCreate,
  isCreating
}: CreatePeriodModalProps) {
  const initialStartDate = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    period_type: "weekly" as PeriodType,
    start_date: initialStartDate,
    end_date: calculateEndDate(initialStartDate, "weekly"),
    base_allowance: child.base_allowance || 0,
    reward_title: "Passeio especial com os pais",
    bonus_goal: 3
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onCreate(formData);
  }

  function handleInputChange(field: string, value: string | number) {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function updateCalculatedEndDate(nextStartDate: string, nextType: PeriodType) {
    setFormData((prev) => ({
      ...prev,
      period_type: nextType,
      start_date: nextStartDate,
      end_date: calculateEndDate(nextStartDate, nextType)
    }));
  }

  return (
    <ModalFrame maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-app-primary">
            Configurar novo periodo
          </h2>
          <p className="mt-2 text-sm text-slate-500">Defina os dados do proximo ciclo de acompanhamento de {child.name}.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock label="Periodo">
            <select
              value={formData.period_type}
              onChange={(e) => updateCalculatedEndDate(formData.start_date, e.target.value as PeriodType)}
              className="field-input"
              disabled={isCreating}
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
            </select>
          </FieldBlock>

          <FieldBlock label="Meta de bonus do periodo">
            <input
              type="number"
              min="1"
              value={formData.bonus_goal}
              onChange={(e) => handleInputChange("bonus_goal", parseInt(e.target.value, 10) || 1)}
              className="field-input"
              disabled={isCreating}
            />
            <p className="mt-2 text-xs italic text-slate-400">Padrao: semanal=3, quinzenal=6, mensal=12</p>
          </FieldBlock>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock label="Data de inicio">
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => updateCalculatedEndDate(e.target.value, formData.period_type)}
              className="field-input"
              disabled={isCreating}
              required
            />
          </FieldBlock>
          <FieldBlock label="Data final">
            <input type="date" value={formData.end_date} readOnly className="field-input bg-slate-50" />
          </FieldBlock>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock label="Valor da Mesada">
            <div className="flex overflow-hidden rounded-xl border border-app-line bg-white">
              <span className="flex items-center border-r border-app-line px-4 text-base font-semibold text-slate-500">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.base_allowance}
                onChange={(e) => handleInputChange("base_allowance", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-3 outline-none"
                disabled={isCreating}
              />
            </div>
          </FieldBlock>

          <FieldBlock label="Recompensa do periodo">
            <input
              type="text"
              value={formData.reward_title}
              onChange={(e) => handleInputChange("reward_title", e.target.value)}
              className="field-input"
              disabled={isCreating}
              required
            />
          </FieldBlock>
        </div>

        <div className="rounded-[18px] bg-slate-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Sugestoes de recompensa:</p>
          <p className="mt-1 text-xs text-slate-400">Faixa etaria: {suggestionGroupLabel}</p>
          <div className="mt-3 space-y-2">
            {rewardSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleInputChange("reward_title", suggestion)}
                className="flex w-full items-center justify-center rounded-xl border border-app-line bg-white px-4 py-2 text-sm font-medium text-app-primary hover:bg-app-soft"
                disabled={isCreating}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ActionButton type="submit" disabled={isCreating}>
            {isCreating ? "Criando..." : "Adicionar"}
          </ActionButton>
          <ActionButton type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </ActionButton>
        </div>
      </form>
    </ModalFrame>
  );
}

function TaskRegisterColumn({
  title,
  tasks,
  taskCounts,
  isSaving,
  tone,
  onAddTask,
  onRemoveTask
}: {
  title: string;
  tasks: Task[];
  taskCounts: TaskCountMap;
  isSaving: Record<string, boolean>;
  tone: "danger" | "success";
  onAddTask: (task: Task) => void;
  onRemoveTask: (task: Task) => void;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-[18px] font-extrabold tracking-[-0.02em] text-slate-800">{title}</h3>
      {tasks.length > 0 ? (
        tasks.map((task) => {
          const count = taskCounts[task.id] ?? 0;
          const saving = !!isSaving[task.id];

          return (
            <div key={task.id} className="rounded-[18px] border border-app-line bg-white p-4 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.5)]">
              <p className="text-lg font-semibold text-slate-700">{task.title}</p>
              <p className={tone === "danger" ? "mt-2 text-base font-bold text-rose-400" : "mt-2 text-base font-bold text-emerald-400"}>
                {formatTaskLine(task.amount, count, tone === "success")}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onAddTask(task)}
                  disabled={saving}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-xl font-semibold text-white disabled:opacity-60"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTask(task)}
                  disabled={saving || count <= 0}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-xl font-semibold text-white disabled:opacity-40"
                >
                  -
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-[18px] border border-dashed border-app-line bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Nenhuma tarefa cadastrada.
        </div>
      )}
    </section>
  );
}

function TaskManagerColumn({
  title,
  tasks,
  isSaving,
  taskCounts,
  amountTone,
  onToggleTaskActive,
  onDeleteTask
}: {
  title: string;
  tasks: Task[];
  isSaving: Record<string, boolean>;
  taskCounts: TaskCountMap;
  amountTone: "success" | "danger";
  onToggleTaskActive: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-[18px] font-extrabold tracking-[-0.02em] text-slate-800">{title}</h3>
      {tasks.length > 0 ? (
        tasks.map((task) => {
          const saving = !!isSaving[task.id];
          const count = taskCounts[task.id] ?? 0;
          const isPositive = amountTone === "success";

          return (
            <div key={task.id} className="flex items-center gap-4 rounded-[18px] border border-app-line bg-white px-4 py-4 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.5)]">
              <div className="h-11 w-1 rounded-full bg-app-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-slate-800">{task.title}</p>
                <p className={amountTone === "danger" ? "mt-2 text-base font-bold text-rose-500" : "mt-2 text-base font-bold text-emerald-500"}>
                  {formatTaskLine(task.amount, count, isPositive)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {(task.is_active ?? true) ? "ativa" : "inativa"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <button
                  type="button"
                  onClick={() => onToggleTaskActive(task)}
                  disabled={saving}
                  className="text-2xl font-semibold text-slate-400 hover:text-app-primary disabled:opacity-50"
                >
                  {(task.is_active ?? true) ? "v" : "+"}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  disabled={saving}
                  className="text-2xl font-semibold text-slate-400 hover:text-rose-500 disabled:opacity-50"
                >
                  x
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-[18px] border border-dashed border-app-line bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Nenhuma tarefa cadastrada.
        </div>
      )}
    </section>
  );
}

function EmptyPeriodState({ onOpenCreatePeriod }: { onOpenCreatePeriod: () => void }) {
  return (
    <div className="rounded-[24px] border border-dashed border-app-line bg-slate-50 px-6 py-8 text-center">
      <h3 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Nenhum periodo aberto</h3>
      <p className="mt-3 text-base leading-8 text-slate-500">
        Abra um novo periodo para comecar a registrar tarefas, acompanhar bonus e fechar o resumo com historico.
      </p>
      <div className="mt-5 flex justify-center">
        <ActionButton onClick={onOpenCreatePeriod} className="w-auto px-6">
          Abrir periodo
        </ActionButton>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success" | "primary";
}) {
  const toneClasses = {
    neutral: "bg-white text-slate-900",
    danger: "bg-white text-rose-500",
    success: "bg-white text-emerald-500",
    primary: "bg-app-primary text-white"
  } as const;

  return (
    <div className={`rounded-[18px] border border-app-line px-4 py-4 ${toneClasses[tone]}`}>
      <p className={tone === "primary" ? "text-xs font-bold uppercase tracking-[0.18em] text-white/70" : "text-xs font-bold uppercase tracking-[0.18em] text-slate-400"}>
        {label}
      </p>
      <p className="mt-2 text-[18px] font-extrabold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  extraValue,
  valueClassName,
  className = ""
}: {
  label: string;
  value: string;
  extraValue?: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={["flex items-center justify-between gap-4 border-b border-app-line py-3", className].join(" ")}>
      <span className="text-lg font-semibold text-slate-500">{label}</span>
      <div className="flex items-center gap-3">
        <span className={["text-lg font-semibold text-slate-900", valueClassName].filter(Boolean).join(" ")}>
          {value}
        </span>
        {extraValue ? (
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-400">{extraValue}</span>
        ) : null}
      </div>
    </div>
  );
}

function SummaryBar({
  label,
  value,
  valueClassName
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-4 text-sm font-semibold">
      <span className="text-slate-500">{label}</span>
      <span className={["text-slate-900", valueClassName].filter(Boolean).join(" ")}>{value}</span>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-3">
      <span className="block text-lg font-semibold text-slate-900">{label}</span>
      {children}
    </label>
  );
}

function ModalFrame({
  children,
  maxWidth = "max-w-xl"
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className={`max-h-[88vh] w-full overflow-y-auto rounded-[32px] bg-white p-8 shadow-[0_30px_80px_-28px_rgba(15,23,42,0.55)] ${maxWidth}`}>
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
}) {
  const variantClasses = {
    primary: "bg-app-primary text-white hover:bg-app-primary-dark",
    secondary: "bg-[#DDE6F2] text-slate-800 hover:bg-[#D4DDEA]",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
    danger: "bg-[#F54343] text-white hover:bg-[#E63535]"
  } as const;

  return (
    <button
      className={[
        "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function getPeriodTypeLabel(periodType: PeriodType) {
  switch (periodType) {
    case "weekly":
      return "Semanal";
    case "biweekly":
      return "Quinzenal";
    case "monthly":
      return "Mensal";
    default:
      return "Semanal";
  }
}

function getAppliedCount(tasks: Task[], taskCounts: TaskCountMap) {
  return tasks.reduce((sum, task) => sum + (taskCounts[task.id] ?? 0), 0);
}

function formatDate(date?: string | null) {
  if (!date) {
    return "-";
  }

  const normalized = `${date}T12:00:00`;
  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("pt-BR").format(parsedDate);
}

function formatDateTime(date?: string | null) {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(parsedDate);
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value ?? 0);
}

function formatSignedCurrency(value: number | null, positive: boolean) {
  const amount = formatCurrency(value ?? 0);
  return `${positive ? "+" : "-"}${amount}`;
}

function formatTaskLine(value: number, count: number, positive: boolean) {
  const safeCount = Math.max(0, count);
  return `${formatSignedCurrency(value, positive)} x ${safeCount} = ${formatSignedCurrency(value * safeCount, positive)}`;
}

function formatSignedCurrencyByAction(
  action: TaskHistoryAction,
  taskType: Task["type"],
  amount: number
) {
  const isPositive = taskType === "bonus" ? action === "add" : action !== "add";
  const prefix = isPositive ? "+" : "-";

  return `${prefix}${formatCurrency(amount)}`;
}
