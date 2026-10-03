"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface PendingSave {
  patch: Record<string, unknown>;
  send: (merged: Record<string, unknown>) => Promise<Response>;
  timer: ReturnType<typeof setTimeout>;
}

const DEBOUNCE_MS = 600;

/** The one place a "did my edit actually save?" indicator is tracked —
 * every patch-on-every-keystroke call across the program/facility editors
 * previously fired and forgot, with nothing on screen confirming it landed
 * (or flagging it if it didn't). `track(fetch(...))` wraps any in-flight
 * save; status flips to "saving" immediately, then "saved"/"error" once the
 * response lands, then fades back to "idle" after a couple of seconds —
 * pair with <SaveStatusBadge status={status} />.
 *
 * `trackDebounced(key, patch, send)` is `track()`'s counterpart for a
 * text/number field whose onChange fires on every keystroke: without this,
 * typing a 6-digit number fired 6 separate PATCH requests. Patches sharing
 * the same `key` within DEBOUNCE_MS of each other are merged into one
 * object and sent as a single request after the pause, not one per
 * keystroke — `key` scopes that merging (e.g. one key per BOQ row, so
 * editing two different rows in quick succession still debounces each
 * independently rather than merging across rows). Local component state
 * should already be updated synchronously by the caller before calling
 * this, same as `track()` — only the network write is delayed, never what
 * the user sees on screen. Status flips to "saving" on the FIRST keystroke
 * of a burst, not just when the request finally goes out, so the badge
 * doesn't sit idle for half a second while someone is actively typing. If
 * the component unmounts with a save still pending (e.g. the user clicks a
 * checkbox, driven through the same debounced path as the text fields
 * around it, then immediately navigates away), it's flushed immediately on
 * unmount rather than silently dropped. */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Map<string, PendingSave>>(new Map());

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      // Flush, don't drop: a debounced save still waiting out its pause when
      // this page unmounts (navigated away right after an edit) still needs
      // to reach the server — there just won't be anyone left to show the
      // status badge update by the time it lands.
      pending.forEach(({ timer, patch, send }) => {
        clearTimeout(timer);
        send(patch).catch(() => {});
      });
      pending.clear();
    };
  }, []);

  const track = useCallback((promise: Promise<Response>) => {
    setStatus("saving");
    promise
      .then((res) => setStatus(res.ok ? "saved" : "error"))
      .catch(() => setStatus("error"))
      .finally(() => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
      });
    return promise;
  }, []);

  const trackDebounced = useCallback(
    (key: string, patch: Record<string, unknown>, send: (merged: Record<string, unknown>) => Promise<Response>, delayMs = DEBOUNCE_MS) => {
      setStatus("saving");
      const existing = pendingRef.current.get(key);
      const merged = { ...(existing?.patch ?? {}), ...patch };
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        pendingRef.current.delete(key);
        track(send(merged));
      }, delayMs);
      pendingRef.current.set(key, { patch: merged, send, timer });
    },
    [track]
  );

  // For an immediate save that supersedes whatever's mid-debounce under
  // `key` (e.g. the explicit "Save progress" button, which already sends
  // the full current state) — drops the pending timer so it doesn't also
  // fire moments later with a now-redundant partial patch.
  const cancelDebounced = useCallback((key: string) => {
    const existing = pendingRef.current.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      pendingRef.current.delete(key);
    }
  }, []);

  return { status, track, trackDebounced, cancelDebounced };
}
