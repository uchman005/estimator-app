"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Input } from "./Form";

// A generic "type the name to confirm" destructive-action modal — more
// friction than a plain window.confirm() on purpose, for actions whose
// blast radius goes beyond the one row being deleted (a program takes
// every facility, BOQ row, opex row and collaborator invite under it with
// it). No `open` prop on purpose: the caller controls visibility by
// mounting/unmounting this (`{showModal && <ConfirmDeleteModal ... />}`),
// which is also what resets the typed-confirmation text for free on every
// reopen — a fresh mount gets a fresh useState, no reset-on-prop-change
// effect or ref needed.
export function ConfirmDeleteModal({
  title,
  description,
  confirmText,
  confirmLabel = "Delete",
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  /** The exact text the user must type to enable the delete button — typically the item's own name. */
  confirmText: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed === confirmText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl border border-clay bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{description}</p>
        <label className="mt-3 block text-[11px] text-muted">
          Type <b className="font-mono text-ink">{confirmText}</b> to confirm
          <Input className="mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus disabled={busy} />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="dangerOutline" onClick={onConfirm} disabled={!matches || busy}>
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
