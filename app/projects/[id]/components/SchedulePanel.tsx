import { Panel } from "@/components/ui/Panel";
import { ScheduleBar, fmtMonths } from "@/components/ui/Metrics";
import type { ScheduleBreakdown } from "@/lib/calc/engine";

export function SchedulePanel({ schedule }: { schedule: ScheduleBreakdown }) {
  return (
    <Panel title="SCHEDULE">
      <ScheduleBar label="Land, permitting & design" months={schedule.prePhaseMonths} totalMonths={schedule.totalMonths} color="var(--color-blueprint)" />
      <ScheduleBar
        label={`Construction${schedule.constructionIsOverridden ? " (manual)" : ""}`}
        months={schedule.constructionMonths}
        totalMonths={schedule.totalMonths}
        color="var(--color-amber)"
      />
      <ScheduleBar label="Commissioning & licensing" months={schedule.commissionMonths} totalMonths={schedule.totalMonths} color="var(--color-green)" />
      <div className="mt-2 flex justify-between border-t border-ink pt-2 text-xs font-semibold">
        <span>Total programme</span>
        <span className="font-mono">{fmtMonths(schedule.totalMonths)}</span>
      </div>
      {schedule.constructionIsOverridden && (
        <p className="mt-1 text-[10px] text-muted">Construction duration is set manually, not derived from the BOQ.</p>
      )}
    </Panel>
  );
}
