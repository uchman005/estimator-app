"use client";

import { useId, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { fmtUsd, fmtUsdMagnitude } from "@/components/ui/Metrics";
import type { CashFlowYear } from "@/lib/calc/engine";

const WIDTH = 760;
const HEIGHT = 260;
const MARGIN = { top: 20, right: 16, bottom: 28, left: 72 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

/** The running cumulative cash position (CashFlowYear.cumulativeBalance) as
 * a single trajectory — the thing `fundingRunwayYears` (one derived number)
 * can't show: the shape of the curve, and exactly which year it crosses from
 * capital-funded into self-funded (or the other way). Positive/negative is a
 * STATE, not an identity, so this uses the dataviz skill's fixed status pair
 * (`--chart-surplus`/`--chart-deficit` in app/globals.css) rather than the
 * CashFlowChart's categorical capex/opex/revenue tokens — reusing those
 * would wrongly imply a 4th flow series. Color is backed by position (above
 * vs. below the zero baseline) as the required secondary encoding for a
 * red/green pair. */
export function CashRunwayChart({ years }: { years: CashFlowYear[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const id = useId();

  if (years.length === 0) return null;

  const values = years.map((y) => y.cumulativeBalance);
  const maxVal = Math.max(0, ...values);
  const minVal = Math.min(0, ...values);
  const range = maxVal - minVal || 1;

  const yToPx = (v: number) => MARGIN.top + PLOT_H * ((maxVal - v) / range);
  const xToPx = (i: number) => (years.length === 1 ? MARGIN.left + PLOT_W / 2 : MARGIN.left + (PLOT_W * i) / (years.length - 1));
  const baselineY = yToPx(0);

  const points = years.map((y, i) => ({ x: xToPx(i), y: yToPx(y.cumulativeBalance) }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${baselineY} L${points[0].x},${baselineY} Z`;

  const ticks: number[] = [0];
  if (maxVal > 0) ticks.push(maxVal, maxVal / 2);
  if (minVal < 0) ticks.push(minVal, minVal / 2);

  const firstBalance = years[0].cumulativeBalance;
  let crossingYear: number | null = null;
  for (let i = 1; i < years.length; i++) {
    if (years[i - 1].cumulativeBalance >= 0 !== years[i].cumulativeBalance >= 0) {
      crossingYear = years[i].year;
      break;
    }
  }
  const lastBalance = years[years.length - 1].cumulativeBalance;
  const caption =
    crossingYear != null
      ? firstBalance < 0
        ? `Turns cash-positive in Year ${crossingYear}.`
        : `Turns cash-negative in Year ${crossingYear}.`
      : lastBalance >= 0
        ? `Stays cash-positive throughout the ${years.length}-year outlook.`
        : `Remains in deficit throughout the ${years.length}-year outlook — see Funding & Feasibility for the implied gap.`;

  const hovered = hoverIdx != null ? years[hoverIdx] : null;
  const hoveredPoint = hoverIdx != null ? points[hoverIdx] : null;
  const lastPoint = points[points.length - 1];
  const lastLabelAbove = lastPoint.y > MARGIN.top + PLOT_H / 2;

  return (
    <Panel title="CUMULATIVE CASH POSITION">
      <p className="mb-3 text-[11.5px] text-muted">
        Running total of every year&apos;s net cash flow (capital spend, operating cost and revenue combined) — where the
        program&apos;s overall cash position stands, not just one year at a time. {caption}
      </p>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`Cumulative cash position by year. ${caption}`}>
          <defs>
            <clipPath id={`${id}-above`}>
              <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={Math.max(0, baselineY - MARGIN.top)} />
            </clipPath>
            <clipPath id={`${id}-below`}>
              <rect x={MARGIN.left} y={baselineY} width={PLOT_W} height={Math.max(0, MARGIN.top + PLOT_H - baselineY)} />
            </clipPath>
          </defs>

          {ticks.map((t) => (
            <line
              key={t}
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yToPx(t)}
              y2={yToPx(t)}
              stroke={t === 0 ? "var(--color-muted)" : "var(--color-border)"}
              strokeWidth={t === 0 ? 1.5 : 1}
            />
          ))}
          {ticks.map((t) => (
            <text key={t} x={MARGIN.left - 8} y={yToPx(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[9px]">
              {fmtUsdMagnitude(t)}
            </text>
          ))}

          <path d={areaPath} fill="var(--chart-surplus)" opacity={0.14} clipPath={`url(#${id}-above)`} />
          <path d={areaPath} fill="var(--chart-deficit)" opacity={0.14} clipPath={`url(#${id}-below)`} />
          <path d={linePath} fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={years[i].cumulativeBalance >= 0 ? "var(--chart-surplus)" : "var(--chart-deficit)"}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ))}

          <text
            x={lastPoint.x}
            y={lastPoint.y + (lastLabelAbove ? -12 : 18)}
            textAnchor="end"
            className="fill-ink text-[11px] font-semibold"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {fmtUsd(lastBalance)}
          </text>

          {years.map((y, i) => (
            <rect
              key={y.year}
              x={MARGIN.left + (PLOT_W * i) / years.length}
              y={MARGIN.top}
              width={PLOT_W / years.length}
              height={PLOT_H}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`Year ${y.year}: cumulative balance ${fmtUsd(y.cumulativeBalance)}`}
              onPointerEnter={() => setHoverIdx(i)}
              onPointerLeave={() => setHoverIdx(null)}
              onFocus={() => setHoverIdx(i)}
              onBlur={() => setHoverIdx(null)}
            />
          ))}

          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              stroke="var(--color-muted)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          )}

          {years.map((y, i) => (
            <text key={y.year} x={xToPx(i)} y={HEIGHT - MARGIN.bottom + 16} textAnchor="middle" className="fill-muted text-[9.5px]">
              Y{y.year}
            </text>
          ))}
        </svg>

        {hovered && hoveredPoint && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-[11px] shadow-md"
            style={{ left: `${Math.min(88, Math.max(12, (hoveredPoint.x / WIDTH) * 100))}%`, transform: "translateX(-50%)" }}
          >
            <div className="mb-1 font-semibold text-ink">Year {hovered.year}</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Cumulative balance</span>
              <span className="font-mono text-ink">{fmtUsd(hovered.cumulativeBalance)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">This year&apos;s net</span>
              <span className="font-mono text-ink">{fmtUsdMagnitude(hovered.net)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-surplus)" }} />
          Capital-funded / surplus
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-deficit)" }} />
          Operating in deficit
        </span>
      </div>

      <table className="mt-3 w-full text-[11px]">
        <thead>
          <tr className="border-b border-paper-line text-left text-[9.5px] uppercase text-muted">
            <th className="py-1 pr-2 font-semibold">Year</th>
            <th className="py-1 text-right font-semibold">Cumulative balance</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year} className="border-b border-paper-line/60">
              <td className="py-1 pr-2">Year {y.year}</td>
              <td className="py-1 text-right font-mono">{fmtUsd(y.cumulativeBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
