import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useState } from "react";

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

// A number only ever needs to look like "-123.45" while someone's actively
// typing it — anything else in the box (an empty string, a bare "-", a
// trailing ".") is a normal, valid, in-progress keystroke, not garbage to
// reject. Rejecting it is exactly what caused the old bug: a controlled
// <input type="number"> whose value is a JS number can never actually BE
// empty, so clearing the box snapped straight back to "0" — and typing a
// digit right after that inserted next to the "0" that was still sitting
// there (producing "09", "0800", ...) rather than replacing it.
const NUMBER_TYPING_RE = /^-?\d*\.?\d*$/;

/** Fixed to exactly 2 decimal places, always — the canonical "at rest"
 * display for every numeric input in the app (distinct from fmtNum()'s
 * read-only formatting, which drops the decimals for a whole number). */
function formatFixed2(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** The bare numeric text input every numeric field in the app goes through
 * (NumField below wraps it with a label) — holds its own draft text while
 * focused so the box can actually be empty mid-edit, committing a parsed
 * number to the caller on every valid keystroke and snapping the display to
 * a clean 2-decimal number on blur. `type="text"` + `inputMode="decimal"`
 * on purpose: a native type="number" input is exactly the thing that can't
 * render an empty string as its `value`, which is the root cause above. */
export function NumberInput({
  value,
  onChange,
  className = "",
  ...rest
}: { value: number; onChange: (v: number) => void; className?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
>) {
  const [text, setText] = useState(() => formatFixed2(value));
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Resync the draft text when `value` changes from outside this input (a
  // reset elsewhere, a server round-trip) — done here, during render, by
  // comparing against a snapshot of the last value seen, rather than in a
  // useEffect (this project's lint forbids setState-in-effect, and this is
  // React's own documented alternative for "adjust state when a prop
  // changes"). Skipped while focused so an in-progress keystroke is never
  // clobbered by the echo of its own last committed value.
  if (!focused && value !== prevValue) {
    setPrevValue(value);
    setText(formatFixed2(value));
  }

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (!NUMBER_TYPING_RE.test(next)) return;
        setText(next);
        if (next !== "" && next !== "-" && next !== ".") {
          const parsed = parseFloat(next);
          if (Number.isFinite(parsed)) onChange(parsed);
        }
      }}
      onBlur={(e) => {
        setFocused(false);
        const parsed = parseFloat(text);
        const final = Number.isFinite(parsed) ? parsed : 0;
        setText(formatFixed2(final));
        onChange(final);
        rest.onBlur?.(e);
      }}
    />
  );
}

export function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <NumberInput className="font-mono" value={value} onChange={onChange} />
        {suffix && <span className="whitespace-nowrap text-[11px] text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}
