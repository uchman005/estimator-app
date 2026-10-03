// Shared building blocks for the print-only summaries (FacilityPrintSummary,
// ProgramPrintSummary) — plain black-on-white, no theme tokens, since these
// render only inside @media print (see the .print-summary rules in
// app/globals.css) and need to look right on paper/PDF export regardless of
// the viewer's on-screen light/dark setting.

export function PrintPage({ children }: { children: React.ReactNode }) {
  return <div className="print-summary hidden print:block print:text-[11px] print:leading-snug">{children}</div>;
}

export function PrintHeader({ title, subtitle, meta }: { title: string; subtitle: string; meta: string[] }) {
  return (
    <header className="mb-4 border-b-2 border-black pb-2">
      <div className="text-[10px] uppercase tracking-wide text-black/60">{subtitle}</div>
      <h1 className="text-[20px] font-bold">{title}</h1>
      <p className="mt-0.5 text-[10px] text-black/70">{meta.join(" · ")}</p>
    </header>
  );
}

export function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-1 border-b border-black/30 pb-0.5 text-[12px] font-bold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

export function PrintRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-0.5 ${strong ? "mt-1 border-t border-black/40 pt-1 font-bold" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export function PrintTable({ columns, rows }: { columns: { label: string; align?: "left" | "right" }[]; rows: React.ReactNode[][] }) {
  return (
    <table>
      <thead>
        <tr className="border-b border-black/40 text-left">
          {columns.map((c, i) => (
            <th key={i} className={`py-0.5 pr-2 text-[10px] font-semibold uppercase ${c.align === "right" ? "text-right" : ""}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-black/15">
            {row.map((cell, j) => (
              <td key={j} className={`py-0.5 pr-2 ${columns[j]?.align === "right" ? "text-right font-mono" : ""}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PrintFooter({ text }: { text: string }) {
  return <footer className="mt-4 border-t border-black/30 pt-1 text-[9px] text-black/60">{text}</footer>;
}
