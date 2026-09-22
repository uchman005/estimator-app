import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { CollaboratorRow } from "./types";

export function CollaboratorsPanel({
  collaborators,
  onInvite,
  onChangeRole,
  onRemove,
}: {
  collaborators: CollaboratorRow[];
  onInvite: (email: string, role: "viewer" | "editor") => Promise<void>;
  onChangeRole: (id: number, role: "viewer" | "editor") => void;
  onRemove: (id: number) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite() {
    setError("");
    setBusy(true);
    try {
      await onInvite(email.trim().toLowerCase(), role);
      setEmail("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="08 — SHARING & COLLABORATORS" eyebrow="owner only">
      <p className="mb-2 text-[11.5px] text-muted">
        A grant here covers every facility in this program. Editors can change everything an owner can except delete the
        program or manage who has access. Viewers can see the full estimate but can&apos;t change anything. Inviting an
        email that hasn&apos;t signed up yet links automatically the moment they create an account.
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label="Invite by email" className="min-w-[220px] flex-1">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as "viewer" | "editor")}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </Select>
        </Field>
        <Button onClick={invite} disabled={busy || !email.includes("@")}>
          {busy ? "Inviting…" : "Invite"}
        </Button>
      </div>
      {error && <p className="mb-2 text-[11px] text-clay">{error}</p>}

      {collaborators.length === 0 ? (
        <p className="text-[11.5px] text-muted">Not shared with anyone yet.</p>
      ) : (
        <table className="w-full text-[12px]">
          <tbody>
            {collaborators.map((c) => (
              <tr key={c.id} className="border-b border-paper-line">
                <td className="py-1.5 pr-2">
                  {c.userName || c.invitedEmail}
                  {c.status === "pending" && <span className="ml-1.5 text-[10px] text-amber">(pending — not signed up yet)</span>}
                </td>
                <td className="py-1.5 pr-2 text-muted">{c.invitedEmail}</td>
                <td className="py-1.5 pr-2 w-28">
                  <Select value={c.role} onChange={(e) => onChangeRole(c.id, e.target.value as "viewer" | "editor")}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </Select>
                </td>
                <td className="py-1.5 text-right">
                  <button onClick={() => onRemove(c.id)} className="text-[11px] text-clay underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
