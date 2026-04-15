import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Missao Mesada",
  description: "Gestao simples de mesada para familias."
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen bg-slate-50">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-3xl items-center px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-dark">
                  Familia
                </p>
                <h1 className="text-xl font-semibold text-slate-900">
                  Missao Mesada
                </h1>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
