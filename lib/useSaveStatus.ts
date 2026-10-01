"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** The one place a "did my edit actually save?" indicator is tracked —
 * every patch-on-every-keystroke call across the program/facility editors
 * previously fired and forgot, with nothing on screen confirming it landed
 * (or flagging it if it didn't). `track(fetch(...))` wraps any in-flight
 * save; status flips to "saving" immediately, then "saved"/"error" once the
 * response lands, then fades back to "idle" after a couple of seconds —
 * pair with <SaveStatusBadge status={status} />. */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const track = useCallback((promise: Promise<Response>) => {
    setStatus("saving");
    promise
      .then((res) => setStatus(res.ok ? "saved" : "error"))
      .catch(() => setStatus("error"))
      .finally(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
      });
    return promise;
  }, []);

  return { status, track };
}
