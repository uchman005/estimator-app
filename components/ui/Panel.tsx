export function Panel({
  title,
  eyebrow,
  accent,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  accent?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${className}`}>
      <div
        className={`flex items-center justify-between px-4 py-2.5 text-[11.5px] font-medium tracking-wide text-on-accent ${
          accent ? "bg-amber" : "bg-blueprint"
        }`}
      >
        <span>{title}</span>
        {eyebrow && <span className="font-mono text-[10px] opacity-80">{eyebrow}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
