import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#eef4ff_40%,_#e8f0ff_100%)] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-6%] h-56 w-56 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute bottom-[-8%] right-[-6%] h-72 w-72 rounded-full bg-app-primary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[440px] rounded-[34px] border border-white/70 bg-white/92 p-7 shadow-[0_35px_90px_-48px_rgba(53,99,233,0.55)] backdrop-blur sm:p-10">
        {children}
      </div>
    </main>
  );
}