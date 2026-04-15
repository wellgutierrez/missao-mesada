import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
};

type ButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string;
  };

function getButtonClasses(variant: Variant, className?: string) {
  const baseClasses =
    "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-3 text-sm font-medium";
  const variantClasses =
    variant === "secondary"
      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      : "bg-brand text-white hover:bg-brand-dark";

  return [baseClasses, variantClasses, className].filter(Boolean).join(" ");
}

export function Button(props: ButtonProps | LinkButtonProps) {
  const variant = props.variant ?? "primary";

  if ("href" in props) {
    const { children, className, href, ...linkProps } = props as LinkButtonProps;

    return (
      <Link href={href} className={getButtonClasses(variant, className)} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { children, className, type = "button", ...buttonProps } = props;

  return (
    <button type={type} className={getButtonClasses(variant, className)} {...buttonProps}>
      {children}
    </button>
  );
}
