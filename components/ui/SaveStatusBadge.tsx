import type { SaveStatus } from "@/lib/useSaveStatus";

const COPY: Record<Exclude<SaveStatus, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved ✓",
  error: "Not saved — check your connection and retry",
};
const COLOR: Record<Exclude<SaveStatus, "idle">, string> = {
  saving: "text-muted",
  saved: "text-green",
  error: "text-clay",
};

export function SaveStatusBadge({ status, className = "" }: { status: SaveStatus; className?: string }) {
  if (status === "idle") return null;
  return <span className={`text-[11px] font-medium ${COLOR[status]} ${className}`}>{COPY[status]}</span>;
}
