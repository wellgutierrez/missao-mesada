"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Child } from "../types";

type GuideBlock = {
  title?: string;
  body: string;
  examples?: string[];
};

type DashboardShellProps = {
  childList: Child[];
  selectedChildId?: string;
  sidebarSlot?: ReactNode;
  headerActions?: ReactNode;
  guideTitle?: string;
  guideIntro?: string;
  guideBlocks?: GuideBlock[];
  children: ReactNode;
};

export function DashboardShell({
  childList,
  selectedChildId,
  sidebarSlot,
  headerActions,
  guideTitle,
  guideIntro,
  guideBlocks,
  children
}: DashboardShellProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const selectedChild = useMemo(
    () => childList.find((child) => child.id === selectedChildId) ?? null,
    [childList, selectedChildId]
  );

  return (
    <div className="min-h-screen bg-app-bg text-slate-900">
      <header className="sticky top-0 z-30 border-b border-app-line bg-white/95 backdrop-blur">
        <div className="flex min-h-[60px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-[22px] font-extrabold tracking-[-0.03em] text-app-primary">
            Missao Mesada
          </Link>

          <div className="flex items-center gap-3">
            {guideBlocks?.length ? (
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-app-line bg-white px-4 py-2 text-sm font-semibold text-app-primary shadow-[0_10px_30px_-24px_rgba(53,99,233,0.55)] hover:bg-app-soft"
              >
                <span aria-hidden="true" className="text-amber-400">*</span>
                Guia rapido para pais
              </button>
            ) : null}

            {headerActions}

            <button
              type="button"
              className="rounded-xl bg-app-danger px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(239,68,68,0.75)]"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-60px)] grid-cols-1 lg:grid-cols-[246px_minmax(0,1fr)]">
        <aside className="border-r border-app-line bg-white">
          <div className="space-y-4 p-4">
            <div>
              <p className="text-base font-semibold text-slate-800">Criancas</p>
            </div>

            <div className="space-y-3">
              {childList.length > 0 ? (
                childList.map((child) => {
                  const isSelected = child.id === selectedChildId;

                  return (
                    <Link
                      key={child.id}
                      href={`/children/${child.id}`}
                      className={[
                        "flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition",
                        isSelected
                          ? "border-app-primary bg-app-soft shadow-[0_12px_30px_-26px_rgba(53,99,233,0.9)]"
                          : "border-app-line bg-white hover:border-app-primary/35 hover:bg-slate-50"
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-primary text-sm font-bold text-white">
                          {child.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{child.name}</p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="rounded-md px-1.5 py-0.5 text-xs">/</span>
                          <span className="rounded-md px-1.5 py-0.5 text-xs">x</span>
                        </div>
                      ) : null}
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-app-line bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Nenhuma crianca cadastrada ainda.
                </div>
              )}
            </div>

            <Link
              href="/children/new"
              className="flex min-h-11 items-center justify-center rounded-xl bg-app-primary px-4 text-sm font-semibold text-white shadow-[0_18px_35px_-24px_rgba(53,99,233,0.95)] hover:bg-app-primary-dark"
            >
              + Nova crianca
            </Link>

            {selectedChild && !sidebarSlot ? (
              <div className="rounded-[22px] border border-app-line bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Perfil atual</p>
                <p className="mt-3 text-lg font-bold text-slate-900">{selectedChild.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedChild.age != null ? `${selectedChild.age} anos` : "Idade nao informada"}
                </p>
                <p className="mt-2 text-sm font-semibold text-app-primary">
                  {formatCurrency(selectedChild.base_allowance ?? 0)} base
                </p>
              </div>
            ) : null}

            {sidebarSlot ? (
              <div className="rounded-[22px] border border-app-line bg-slate-50 p-4">
                {sidebarSlot}
              </div>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      {isGuideOpen && guideBlocks?.length ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white p-8 shadow-[0_30px_80px_-28px_rgba(15,23,42,0.55)]">
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="absolute right-5 top-5 rounded-full px-3 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fechar guia"
            >
              x
            </button>

            <div className="space-y-5">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-slate-900">
                  {guideTitle ?? "Como usar o Missao Mesada com seu filho"}
                </h2>
              </div>

              {guideIntro ? (
                <div className="rounded-2xl border-l-4 border-app-primary bg-app-soft px-5 py-4 text-base leading-8 text-slate-700">
                  {guideIntro}
                </div>
              ) : null}

              {guideBlocks.map((block, index) => (
                <div key={`${block.title ?? "guia"}-${index}`} className="rounded-2xl border-l-4 border-sky-400 bg-slate-50 px-5 py-5">
                  {block.title ? (
                    <h3 className="text-[18px] font-bold tracking-[-0.02em] text-slate-900">{block.title}</h3>
                  ) : null}
                  <p className={block.title ? "mt-2 text-lg leading-8 text-slate-700" : "text-lg leading-8 text-slate-700"}>
                    {block.body}
                  </p>
                  {block.examples?.length ? (
                    <div className="mt-4 border-t border-app-line pt-4">
                      <p className="text-base font-semibold text-slate-900">Exemplos:</p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-slate-600">
                        {block.examples.map((example) => (
                          <li key={example}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}