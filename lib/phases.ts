// Shared between the program editor's Facilities panel and the standalone
// /facilities page — a facility's build-out phase, matching the hospital
// system diagram's Phase 1 (Infrastructure Commissioning) / Phase 2
// (Improvement) / Phase 3 (Expansion).
export type Phase = "phase_1" | "phase_2" | "phase_3";

export const PHASE_ORDER: Phase[] = ["phase_1", "phase_2", "phase_3"];

export const PHASE_LABEL: Record<Phase, string> = {
  phase_1: "Phase 1 — Infrastructure Commissioning",
  phase_2: "Phase 2 — Improvement",
  phase_3: "Phase 3 — Expansion",
};
