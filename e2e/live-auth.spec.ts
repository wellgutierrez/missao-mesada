import { expect, test } from "@playwright/test";

const liveEmail = process.env.E2E_LIVE_EMAIL;
const livePassword = process.env.E2E_LIVE_PASSWORD;
const liveChildName = process.env.E2E_LIVE_CHILD_NAME ?? "Teste Copilot";
const liveProfileName = process.env.E2E_LIVE_PROFILE_NAME ?? "Responsavel Teste Copilot";
const liveProfilePhone = process.env.E2E_LIVE_PROFILE_PHONE ?? "11999998888";
const hasLiveAuthEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && liveEmail && livePassword);

function buildUniqueLabel(base: string) {
  return `${base} ${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

async function loginWithRealUser(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(liveEmail ?? "");
  await page.locator('input[name="password"]').fill(livePassword ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function createChildFromDashboard(page: Parameters<Parameters<typeof test>[1]>[0]["page"], childName: string) {
  await page.getByRole("link", { name: "+ Nova crianca" }).click();
  await expect(page).toHaveURL(/\/children\/new$/);
  await expect(page.getByRole("heading", { name: "Nova Crianca" })).toBeVisible();

  await page.getByLabel("Nome da crianca").fill(childName);
  await page.getByLabel("Idade da crianca").fill("8");
  await page.getByLabel("Valor da Mesada").fill("25");
  await page.getByRole("button", { name: "Adicionar" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(childName)).toBeVisible();
}

async function openChildProfileFromDashboard(page: Parameters<Parameters<typeof test>[1]>[0]["page"], childName: string) {
  const childCard = page.locator("div.rounded-\[22px\]", { hasText: childName }).first();
  await childCard.getByRole("link", { name: "Abrir perfil" }).click();
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();
}

async function deleteChildFromDashboard(page: Parameters<Parameters<typeof test>[1]>[0]["page"], childName: string) {
  await page.goto("/");
  const childCard = page.locator("div.rounded-\[22px\]", { hasText: childName }).first();

  await expect(childCard).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });

  await childCard.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText(`Perfil de ${childName} excluido com sucesso.`)).toBeVisible();
}

test.describe("live auth flow", () => {
  test.skip(!hasLiveAuthEnv, "Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_LIVE_EMAIL e E2E_LIVE_PASSWORD para rodar este fluxo real.");

  test("logs in with a real Supabase account and reaches the family dashboard", async ({ page }) => {
    await loginWithRealUser(page);
    await expect(page.getByText("Painel da familia")).toBeVisible();
    await expect(page.getByRole("link", { name: "+ Nova crianca" })).toBeVisible();
  });

  test("creates a child with a real authenticated session", async ({ page }) => {
    const childName = buildUniqueLabel(liveChildName);

    await loginWithRealUser(page);

    try {
      await createChildFromDashboard(page, childName);
    } finally {
      await deleteChildFromDashboard(page, childName);
    }
  });

  test("updates the responsible profile with a real authenticated session", async ({ page }) => {
    await loginWithRealUser(page);
    await page.goto("/perfil");

    await expect(page.getByRole("heading", { name: "Perfil da familia" })).toBeVisible();
    await page.getByLabel("Nome completo").fill(liveProfileName);
    await page.getByLabel("Celular").fill(liveProfilePhone);
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    await expect(page.getByText("Perfil salvo com sucesso.")).toBeVisible();
    await expect(page.getByLabel("Nome completo")).toHaveValue(liveProfileName);
    await expect(page.getByLabel("Celular")).toHaveValue(liveProfilePhone);
  });

  test("creates a period and a bonus task for a real child profile", async ({ page }) => {
    const childName = buildUniqueLabel(liveChildName);
    const taskTitle = buildUniqueLabel("Tarefa Bonus Copilot");

    await loginWithRealUser(page);

    try {
      await createChildFromDashboard(page, childName);
      await openChildProfileFromDashboard(page, childName);

      await page.getByRole("button", { name: "Resumo" }).click();
      await page.getByRole("button", { name: "Abrir periodo" }).click();

      await expect(page.getByRole("heading", { name: "Configurar novo periodo" })).toBeVisible();
      await page.getByRole("button", { name: "Adicionar" }).click();

      await expect(page.getByText("Periodo Vigente")).toBeVisible();

      await page.getByRole("button", { name: "Tarefas" }).click();
      await page.getByRole("button", { name: "+ Adicionar Tarefa Bonus" }).click();

      await expect(page.getByRole("heading", { name: "Adicionar Tarefa Bonus" })).toBeVisible();
      await page.getByLabel("Titulo").fill(taskTitle);
      await page.getByLabel("Valor").fill("5");
      await page.getByRole("button", { name: "Adicionar Tarefa" }).click();

      await expect(page.getByText(taskTitle)).toBeVisible();
      await expect(page.getByText("Meta atual:")).toBeVisible();
    } finally {
      await deleteChildFromDashboard(page, childName);
    }
  });

  test("records a bonus task, updates reward, and closes the real period into history", async ({ page }) => {
    const childName = buildUniqueLabel(liveChildName);
    const taskTitle = buildUniqueLabel("Tarefa Bonus Copilot");
    const rewardTitle = buildUniqueLabel("Recompensa Copilot");

    await loginWithRealUser(page);

    try {
      await createChildFromDashboard(page, childName);
      await openChildProfileFromDashboard(page, childName);

      await page.getByRole("button", { name: "Resumo" }).click();
      await page.getByRole("button", { name: "Abrir periodo" }).click();
      await expect(page.getByRole("heading", { name: "Configurar novo periodo" })).toBeVisible();
      await page.getByRole("button", { name: "Adicionar" }).click();
      await expect(page.getByText("Periodo Vigente")).toBeVisible();

      await page.getByRole("button", { name: "Tarefas" }).click();
      await page.getByRole("button", { name: "+ Adicionar Tarefa Bonus" }).click();
      await expect(page.getByRole("heading", { name: "Adicionar Tarefa Bonus" })).toBeVisible();
      await page.getByLabel("Titulo").fill(taskTitle);
      await page.getByLabel("Valor").fill("5");
      await page.getByRole("button", { name: "Adicionar Tarefa" }).click();
      await expect(page.getByText(taskTitle)).toBeVisible();

      await page.getByRole("button", { name: "Registro" }).click();
      const registerCard = page.locator("div.rounded-\[18px\]", { hasText: taskTitle }).first();
      await registerCard.getByRole("button", { name: "+" }).click();
      await expect(page.getByText("R$ 30,00")).toBeVisible();

      await page.getByRole("button", { name: "Tarefas" }).click();
      await page.getByRole("button", { name: "Editar Recompensa" }).click();
      await expect(page.getByRole("heading", { name: "Definir Recompensa do Periodo" })).toBeVisible();
      await page.getByLabel("Recompensa").fill(rewardTitle);
      await page.getByLabel("Meta de bonus").fill("1");
      await page.getByRole("button", { name: "Salvar Recompensa" }).click();
      await expect(page.getByText(rewardTitle)).toBeVisible();
      await expect(page.getByText("Meta atual: 1 / 1 tarefas bonus atingida.")).toBeVisible();

      await page.getByRole("button", { name: "Resumo" }).click();
      await page.getByRole("button", { name: "Encerrar periodo" }).click();
      await expect(page.getByRole("heading", { name: "Resumo de Fechamento" })).toBeVisible();
      await expect(page.getByText(rewardTitle)).toBeVisible();
      await page.getByRole("button", { name: "Confirmar e configurar proximo periodo" }).click();

      await expect(page.getByRole("heading", { name: "Configurar novo periodo" })).toBeVisible();
      await page.getByRole("button", { name: "Cancelar" }).click();
      await expect(page.getByRole("button", { name: "Abrir periodo" })).toBeVisible();

      await page.getByRole("button", { name: "Historico de Periodos" }).click();
      await expect(page.getByRole("heading", { name: "Historico de Periodos" })).toBeVisible();
      await page.locator("button", { hasText: "R$ 30,00" }).first().click();

      await expect(page.getByRole("heading", { name: "Detalhes do Periodo" })).toBeVisible();
      await expect(page.getByText("CONQUISTOU")).toBeVisible();
      await expect(page.getByText(rewardTitle)).toBeVisible();
      await expect(page.getByText("1 / 1")).toBeVisible();
    } finally {
      await deleteChildFromDashboard(page, childName);
    }
  });
});