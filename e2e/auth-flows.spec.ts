import { expect, test } from "@playwright/test";

test.describe("public auth flows", () => {
  test("redirects unauthenticated home access to login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Missao Mesada" })).toBeVisible();
  });

  test("shows client-side validation on login before calling Supabase", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Preencha email e senha para continuar.")).toBeVisible();

    await page.getByLabel("Email").fill("familia@email.com");
    await page.locator('input[name="password"]').fill("1234567");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres.")).toBeVisible();
  });

  test("navigates from login to signup", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Cadastrar" }).click();

    await expect(page).toHaveURL(/\/cadastro$/);
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
  });

  test("shows signup validation messages before any backend call", async ({ page }) => {
    await page.goto("/cadastro");

    await page.getByLabel("Email").fill("familia@email.com");
    await page.locator('input[name="password"]').fill("12345678");
    await page.locator('input[name="confirmPassword"]').fill("87654321");
    await page.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.getByText("Informe seu nome completo.")).toBeVisible();

    await page.getByLabel("Nome completo").fill("Maria Silva");
    await page.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.getByText("As senhas precisam ser iguais.")).toBeVisible();
  });
});