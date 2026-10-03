export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-paper-line px-2.5 py-2">
      <div className="text-[10px] tracking-wide text-muted">{label}</div>
      <div className="font-mono text-[17px] font-semibold text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

export function BreakdownRow({ label, value, strong, section }: { label: string; value?: string; strong?: boolean; section?: boolean }) {
  if (section) {
    return <div className="pt-2 pb-0.5 text-[11px] font-semibold text-blueprint">{label}</div>;
  }
  return (
    <div
      className={
        strong
          ? "mt-1 flex justify-between border-t-2 border-ink pt-2 text-[12px] font-bold"
          : "flex justify-between border-b border-paper-line py-1 text-[12px]"
      }
    >
      <span>{label}</span>
      {value && <span className="font-mono">{value}</span>}
    </div>
  );
}

export function ScheduleBar({ label, months, totalMonths, color }: { label: string; months: number; totalMonths: number; color: string }) {
  if (months <= 0) return null;
  const pct = Math.max(2, (months / totalMonths) * 100);
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-[11px]">
        <span>{label}</span>
        <span className="font-mono">{fmtMonths(months)}</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-sm bg-paper-line">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// The one place any non-currency number gets formatted — a whole number
// shows no decimals ("8", not "8.00"), anything else is fixed to exactly 2
// decimal places ("8.333..." becomes "8.33", "29.7" becomes "29.70"),
// rather than every call site picking its own precision (or none, risking
// raw floating-point noise like 29.700000000000003 reaching the screen).
export function fmtNum(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("en-US")
    : rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtPct(n: number): string {
  return `${fmtNum(n)}%`;
}
// Whole months only — a Class 5 (concept-stage) schedule has no business
// implying sub-month precision; "27.63 months" reads as more certain than
// this model actually is. Rounds, doesn't truncate (27.5 → 28, not 27).
export function fmtMonths(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} mo`;
}
// A magnitude only, no sign — pair with a label that already says which way
// it goes ("Annual deficit", "Annual surplus"). A signed number under an
// already-signed label is a double negative ("Annual deficit: −$X") that
// makes the sign convention ambiguous; this is the one place that gets
// resolved, rather than every call site re-deciding how to show it.
export function fmtUsdMagnitude(n: number): string {
  return fmtUsd(Math.abs(n));
}
export function fmtUsd(n: number): string {
  const neg = n < 0;
  return (neg ? "\u2212" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
}
export function fmtLocal(n: number, symbol?: string): string {
  const neg = n < 0;
  return (neg ? "\u2212" : "") + (symbol ? symbol + " " : "") + Math.round(Math.abs(n)).toLocaleString("en-US");
}
export function fmtRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  // SQLite's CURRENT_TIMESTAMP yields "YYYY-MM-DD HH:MM:SS" (UTC, no timezone
  // marker) — normalize to a real ISO string so Date parses it as UTC rather
  // than guessing the local timezone.
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T") + "Z";
  const ms = Date.now() - new Date(normalized).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
