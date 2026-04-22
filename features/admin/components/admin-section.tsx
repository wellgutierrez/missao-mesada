import type { ReactNode } from "react";
import { AdminCard } from "@/features/admin/components/admin-card";

type AdminSectionProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AdminSection({ eyebrow, title, description, children, className }: AdminSectionProps) {
  return (
    <AdminCard className={className}>
      <div className="p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p> : null}
        {children}
      </div>
    </AdminCard>
  );
}