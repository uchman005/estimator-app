export function PageHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mt-0.5 max-w-xl text-sm text-muted">{children}</p>
    </div>
  );
}
