"use client";

import { useId, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { fmtUsd, fmtUsdMagnitude } from "@/components/ui/Metrics";
import type { CashFlowYear } from "@/lib/calc/engine";

const WIDTH = 760;
const HEIGHT = 320;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 64 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const BASELINE_Y = MARGIN.top + PLOT_H / 2;
const HALF_H = PLOT_H / 2 - 8; // 8px headroom top & bottom

const SERIES = [
  { key: "capexOutflow", label: "Capital spend", color: "var(--chart-capex)" },
  { key: "opexOutflow", label: "Operating cost", color: "var(--chart-opex)" },
  { key: "revenueInflow", label: "Revenue", color: "var(--chart-revenue)" },
] as const;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Year-by-year capex/opex/revenue, read straight off computeCashFlowTimeline()
 * — a stacked diverging bar per year (capex+opex below the zero baseline,
 * revenue above it), so the one thing none of the report's lump-sum figures
 * can show — WHEN money moves, not just how much — is visible at a glance.
 * Colors are the chart-only `--chart-*` tokens (see app/globals.css), picked
 * and CVD-validated specifically for this use rather than reusing the app's
 * general UI accent tokens — see that file's comment for why. */
export function CashFlowChart({ years }: { years: CashFlowYear[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradientId = useId();

  if (years.length === 0) return null;

  const maxOutflow = Math.max(...years.map((y) => y.capexOutflow + y.opexOutflow));
  const maxInflow = Math.max(...years.map((y) => y.revenueInflow));
  const scaleMax = niceMax(Math.max(maxOutflow, maxInflow, 1));

  const colW = PLOT_W / years.length;
  const barW = Math.min(40, colW * 0.6);

  const yToPx = (v: number) => (v / scaleMax) * HALF_H;

  const firstOperationalYear = years.find((y) => y.opexOutflow > 0 || y.revenueInflow > 0)?.year;
  const lastConstructionYear = firstOperationalYear ? firstOperationalYear - 1 : null;

  const hovered = hoverIdx != null ? years[hoverIdx] : null;
  const gridTicks = [1, 0.5, 0, -0.5, -1];

  return (
    <Panel title="CASH FLOW OVER TIME">
      <p className="mb-3 text-[11.5px] text-muted">
        Capital spend during each facility&apos;s own construction window, then operating cost and revenue once it&apos;s
        operational.
        {lastConstructionYear != null && lastConstructionYear >= 1 && (
          <> Recurring cost and revenue begin entering the picture in Year {firstOperationalYear}.</>
        )}
      </p>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Cash flow by year: capital spend, operating cost and revenue">
          <defs>
            <clipPath id={`${gradientId}-plot`}>
              <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          </defs>

          {/* gridlines */}
          {gridTicks.map((t) => (
            <line
              key={t}
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={BASELINE_Y - t * HALF_H}
              y2={BASELINE_Y - t * HALF_H}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          ))}
          {gridTicks.map((t) => (
            <text key={t} x={MARGIN.left - 8} y={BASELINE_Y - t * HALF_H} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[9px]">
              {fmtUsdMagnitude(t * scaleMax)}
            </text>
          ))}

          {/* baseline (zero) */}
          <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={BASELINE_Y} y2={BASELINE_Y} stroke="var(--color-muted)" strokeWidth={1} />

          {/* bars */}
          {years.map((y, i) => {
            const cx = MARGIN.left + colW * i + colW / 2;
            const capexH = yToPx(y.capexOutflow);
            const opexH = yToPx(y.opexOutflow);
            const revH = yToPx(y.revenueInflow);
            const isHovered = hoverIdx === i;
            return (
              <g key={y.year} opacity={hoverIdx == null || isHovered ? 1 : 0.55}>
                {/* capex: sits just below baseline */}
                {capexH > 0 && (
                  <rect x={cx - barW / 2} y={BASELINE_Y} width={barW} height={Math.max(0, capexH - 1)} fill="var(--chart-capex)" rx={2} />
                )}
                {/* opex: stacked below capex, 2px surface gap */}
                {opexH > 0 && (
                  <rect
                    x={cx - barW / 2}
                    y={BASELINE_Y + capexH + (capexH > 0 ? 2 : 0)}
                    width={barW}
                    height={Math.max(0, opexH - (capexH > 0 ? 2 : 0))}
                    fill="var(--chart-opex)"
                    rx={2}
                  />
                )}
                {/* revenue: above baseline */}
                {revH > 0 && (
                  <rect x={cx - barW / 2} y={BASELINE_Y - revH} width={barW} height={Math.max(0, revH - 1)} fill="var(--chart-revenue)" rx={2} />
                )}
                {/* hover/focus hit target — full column height */}
                <rect
                  x={MARGIN.left + colW * i}
                  y={MARGIN.top}
                  width={colW}
                  height={PLOT_H}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`Year ${y.year}: capital spend ${fmtUsd(y.capexOutflow)}, operating cost ${fmtUsd(y.opexOutflow)}, revenue ${fmtUsd(y.revenueInflow)}`}
                  onPointerEnter={() => setHoverIdx(i)}
                  onPointerLeave={() => setHoverIdx(null)}
                  onFocus={() => setHoverIdx(i)}
                  onBlur={() => setHoverIdx(null)}
                />
                <text x={cx} y={HEIGHT - MARGIN.bottom + 16} textAnchor="middle" className="fill-muted text-[9.5px]">
                  Y{y.year}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-[11px] shadow-md"
            style={{
              left: `${Math.min(88, Math.max(12, ((hoverIdx! + 0.5) / years.length) * 100))}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="mb-1 font-semibold text-ink">Year {hovered.year}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="inline-block h-[2px] w-3" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono text-ink">{fmtUsd(hovered[s.key])}</span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-paper-line pt-1 font-semibold">
              <span>Net</span>
              <span className="font-mono">{fmtUsdMagnitude(hovered.net)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-3" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <table className="mt-3 w-full text-[11px]">
        <thead>
          <tr className="border-b border-paper-line text-left text-[9.5px] uppercase text-muted">
            <th className="py-1 pr-2 font-semibold">Year</th>
            <th className="py-1 pr-2 text-right font-semibold">Capital spend</th>
            <th className="py-1 pr-2 text-right font-semibold">Operating cost</th>
            <th className="py-1 pr-2 text-right font-semibold">Revenue</th>
            <th className="py-1 pr-2 text-right font-semibold">Net</th>
            <th className="py-1 text-right font-semibold">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year} className="border-b border-paper-line/60">
              <td className="py-1 pr-2">Year {y.year}</td>
              <td className="py-1 pr-2 text-right font-mono">{fmtUsd(y.capexOutflow)}</td>
              <td className="py-1 pr-2 text-right font-mono">{fmtUsd(y.opexOutflow)}</td>
              <td className="py-1 pr-2 text-right font-mono">{fmtUsd(y.revenueInflow)}</td>
              <td className="py-1 pr-2 text-right font-mono">{fmtUsdMagnitude(y.net)}</td>
              <td className="py-1 text-right font-mono">{fmtUsdMagnitude(y.cumulativeBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-muted">
        Capital spend is assumed even across each facility&apos;s own construction window (starting after its own land/
        design/permitting lead time), with every included facility starting on day one of the program. Operating cost
        compounds at the program&apos;s escalation rate once a facility is operational; revenue is held flat (no
        escalation assumption exists for it).
      </p>
    </Panel>
  );
}
