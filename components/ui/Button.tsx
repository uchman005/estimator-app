import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "accent" | "dangerOutline" | "addBorder";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-blueprint border border-blueprint text-on-accent hover:bg-blueprint-hover hover:border-blueprint-hover",
  ghost: "bg-transparent border border-border text-muted hover:border-blueprint hover:text-blueprint",
  accent: "bg-amber border border-amber text-white font-semibold hover:bg-amber-dark",
  dangerOutline: "bg-transparent border border-clay text-clay hover:bg-clay hover:text-white",
  addBorder: "bg-transparent border border-blueprint text-blueprint hover:bg-blueprint hover:text-on-accent",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}

export function ClassBadge({ code }: { code: string }) {
  return (
    <span className="whitespace-nowrap rounded-md border border-border bg-surface-alt px-1.5 py-0.5 font-mono text-[10px] text-blueprint">
      {code}
    </span>
  );
}
