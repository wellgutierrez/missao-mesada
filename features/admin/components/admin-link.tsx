import Link from "next/link";

type AdminLinkProps = {
  label?: string;
  variant?: "header" | "shortcut";
};

export function AdminLink({ label = "Admin", variant = "header" }: AdminLinkProps) {
  const className =
    variant === "shortcut"
      ? "inline-flex min-h-11 items-center justify-center rounded-xl border border-app-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      : "inline-flex items-center rounded-xl border border-app-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";

  return (
    <Link href="/admin" className={className}>
      {label}
    </Link>
  );
}