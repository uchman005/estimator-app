import { Panel } from "@/components/ui/Panel";
import { fmtUsd, fmtNum, fmtPct, fmtUsdMagnitude } from "@/components/ui/Metrics";
import type { ProgramReport } from "@/lib/calc/engine";

export const VERDICT_COPY: Record<ProgramReport["verdict"], (f: ProgramReport) => { title: string; desc: string; color: string }> = {
  not_feasible: (f) => ({
    title: "Not feasible as currently scoped",
    desc: `Funding gap of ${fmtUsd(f.gap)} (${fmtUsd(f.gapAtBandHigh)} at the estimate's upper band) exceeds half the estimated cost — close it or cut scope before committing.`,
    color: "var(--color-clay)",
  }),
  conditional_funding: (f) => ({
    title: "Feasible with conditions",
    desc: `A funding gap of ${fmtUsd(f.gap)} remains at the point estimate (${fmtUsd(f.gapAtBandHigh)} at the upper band) — buildable if closed on a realistic timeline.`,
    color: "var(--color-amber)",
  }),
  conditional_ops: (f) => {
    const runway =
      f.fundingRunwayYears >= 1
        ? ` A ${fmtUsd(f.surplus)} capital surplus could self-fund the shortfall for about ${fmtNum(f.fundingRunwayYears)} years before new funding would be needed.`
        : "";
    return {
      title: "Capital feasible, operations fragile",
      desc: `Revenue covers only ${fmtNum(f.sustainabilityRatio)}% of estimated annual operating cost.${runway}`,
      color: "var(--color-amber)",
    };
  },
  feasible: () => ({
    title: "Feasible",
    desc: "Capital is funded and the operating model is expected to cover its own running costs.",
    color: "var(--color-green)",
  }),
};

export function FeasibilityPanel({ report }: { report: ProgramReport }) {
  const copy = VERDICT_COPY[report.verdict](report);
  const isDeficit = report.operatingBalance < 0;
  return (
    <Panel title="PROGRAM FEASIBILITY VERDICT">
      <div className="mb-2 border-l-4 bg-paper-warm p-2.5" style={{ borderColor: copy.color }}>
        <div className="text-[13px] font-bold">{copy.title}</div>
        <div className="mt-0.5 text-[11.5px] text-muted">{copy.desc}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-paper-line px-2 py-1.5">
          <div className="text-[10px] text-muted">{isDeficit ? "ANNUAL DEFICIT" : "ANNUAL SURPLUS"}</div>
          <div className={`font-mono font-semibold ${isDeficit ? "text-clay" : "text-green"}`}>
            {fmtUsdMagnitude(report.operatingBalance)}/yr
          </div>
          <div className="mt-0.5 text-[9.5px] text-muted">
            range: {fmtUsdMagnitude(report.operatingBalanceAtBandLow)} – {fmtUsdMagnitude(report.operatingBalanceAtBandHigh)}/yr
          </div>
        </div>
        <div className="border border-paper-line px-2 py-1.5">
          <div className="text-[10px] text-muted">REVENUE/OPEX RATIO</div>
          <div className="font-mono font-semibold">{fmtPct(report.sustainabilityRatio)}</div>
        </div>
      </div>
      {report.fundingRunwayYears >= 1 && (
        <div className="mt-2 border border-paper-line px-2 py-1.5">
          <div className="text-[10px] text-muted">FUNDING RUNWAY FROM CAPITAL SURPLUS</div>
          <div className="font-mono font-semibold">
            {fmtUsd(report.surplus)} ÷ {fmtUsd(report.opex)}/yr ≈ {fmtNum(report.fundingRunwayYears)} years
          </div>
        </div>
      )}
    </Panel>
  );
}
