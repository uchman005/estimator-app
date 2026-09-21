import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-[11px] text-muted ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-blueprint/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-blueprint/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function NumField({
  label,
  value,
  onChange,
  step = "any",
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <Input type="number" step={step} className="font-mono" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        {suffix && <span className="whitespace-nowrap text-[11px] text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}
