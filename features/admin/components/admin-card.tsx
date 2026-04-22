import type { ReactNode } from "react";

type AdminCardProps = {
  children: ReactNode;
  className?: string;
};

export function AdminCard({ children, className }: AdminCardProps) {
  return <div className={joinClassNames("rounded-[28px] border border-app-line bg-white shadow-[0_24px_70px_-42px_rgba(53,99,233,0.35)]", className)}>{children}</div>;
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}