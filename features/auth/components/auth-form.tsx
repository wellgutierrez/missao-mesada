"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

type AuthCopy = {
  title: string;
  subtitle: string;
  submitLabel: string;
  alternatePrompt: string;
  alternateLabel: string;
  alternateHref: string;
};

const copyByMode: Record<AuthMode, AuthCopy> = {
  login: {
    title: "Missao Mesada",
    subtitle: "Educacao financeira comeca em casa",
    submitLabel: "Entrar",
    alternatePrompt: "Nao tem conta?",
    alternateLabel: "Cadastrar",
    alternateHref: "/cadastro"
  },
  signup: {
    title: "Criar conta",
    subtitle: "Monte o acesso da familia em poucos segundos",
    submitLabel: "Cadastrar",
    alternatePrompt: "Ja tem conta?",
    alternateLabel: "Entrar",
    alternateHref: "/login"
  }
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const copy = copyByMode[mode];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage("Preencha email e senha para continuar.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (mode === "signup" && fullName.trim().length < 3) {
      setErrorMessage("Informe seu nome completo.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("As senhas precisam ser iguais.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (error) {
          setErrorMessage(getFriendlyAuthError(error.message));
          return;
        }

        router.push("/");
        router.refresh();
        return;
      }

      const emailRedirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: normalizePhone(phone)
          },
          emailRedirectTo
        }
      });

      if (error) {
        setErrorMessage(getFriendlyAuthError(error.message));
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setSuccessMessage("Conta criada. Se a confirmacao por email estiver ativada no Supabase, confira sua caixa de entrada antes de entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3 pt-6 text-center sm:pt-10">
        <h1 className="text-[32px] font-extrabold tracking-[-0.04em] text-app-primary sm:text-[40px]">
          {copy.title}
        </h1>
        <p className="text-base text-slate-500 sm:text-[22px] sm:leading-8">{copy.subtitle}</p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit} suppressHydrationWarning>
        {mode === "signup" ? (
          <AuthField
            label="Nome completo"
            type="text"
            name="fullName"
            autoComplete="name"
            placeholder="Seu nome"
            value={fullName}
            onChange={setFullName}
          />
        ) : null}

        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={setEmail}
        />

        {mode === "signup" ? (
          <AuthField
            label="Celular"
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={setPhone}
          />
        ) : null}

        <div className="space-y-2">
          <AuthField
            label="Senha"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="........"
            value={password}
            onChange={setPassword}
            action={
              <TogglePasswordButton
                isVisible={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              />
            }
          />
          <p className="text-sm text-slate-500">Minimo 8 caracteres</p>
        </div>

        {mode === "signup" ? (
          <AuthField
            label="Confirmar senha"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="........"
            value={confirmPassword}
            onChange={setConfirmPassword}
            action={
              <TogglePasswordButton
                isVisible={showConfirmPassword}
                onClick={() => setShowConfirmPassword((current) => !current)}
              />
            }
          />
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-app-primary px-5 text-lg font-extrabold text-white shadow-[0_20px_40px_-24px_rgba(53,99,233,0.95)] hover:bg-app-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Carregando..." : copy.submitLabel}
        </button>
      </form>

      <div className="space-y-2 text-center text-slate-500">
        <p className="text-base">{copy.alternatePrompt}</p>
        <Link href={copy.alternateHref} className="inline-flex text-[30px] font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-app-primary">
          {copy.alternateLabel}
        </Link>
      </div>
    </div>
  );
}

type AuthFieldProps = {
  label: string;
  type: string;
  name: string;
  autoComplete?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  action?: ReactNode;
};

function AuthField({
  label,
  type,
  name,
  autoComplete,
  placeholder,
  value,
  onChange,
  action
}: AuthFieldProps) {
  return (
    <label className="block space-y-3">
      <span className="text-base font-semibold text-slate-700">{label}</span>
      <span className="flex overflow-hidden rounded-2xl border border-app-line bg-white shadow-[0_12px_26px_-26px_rgba(15,23,42,0.6)] transition focus-within:border-app-primary focus-within:ring-2 focus-within:ring-app-primary/15">
        <input
          type={type}
          name={name}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          suppressHydrationWarning
          className="h-14 w-full border-0 bg-transparent px-4 text-base text-slate-700 outline-none"
        />
        {action ? <span className="flex items-center px-3">{action}</span> : null}
      </span>
    </label>
  );
}

type TogglePasswordButtonProps = {
  isVisible: boolean;
  onClick: () => void;
};

function TogglePasswordButton({ isVisible, onClick }: TogglePasswordButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
        {isVisible ? null : <path d="m4 4 16 16" />}
      </svg>
    </button>
  );
}

function getFriendlyAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email ou senha invalidos.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "Ja existe uma conta com esse email.";
  }

  return "Nao foi possivel concluir a autenticacao. Tente novamente.";
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}