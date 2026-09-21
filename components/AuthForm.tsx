"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: mode === "signup" ? name : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-ink">{mode === "login" ? "Sign in" : "Create an account"}</h1>
        <p className="mb-4 text-xs text-muted">Classified Infrastructure Estimator</p>

        <div className="space-y-3">
          {mode === "signup" && (
            <Field label="Name (optional)">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-xs text-clay">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={busy || !email || !password}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          {mode === "login" ? (
            <>
              No account? <a href="/signup" className="text-blueprint underline">Sign up</a>
            </>
          ) : (
            <>
              Already have an account? <a href="/login" className="text-blueprint underline">Sign in</a>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
