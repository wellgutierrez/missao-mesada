import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/components/auth-form";
import { redirectAuthenticatedUser } from "@/features/auth/data/get-auth-user";
import { AuthShell } from "@/features/auth/components/auth-shell";

export const metadata: Metadata = {
  title: "Cadastro | Missao Mesada"
};

export default async function CadastroPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  );
}