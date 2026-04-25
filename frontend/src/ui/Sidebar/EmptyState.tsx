export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
        no contact selected
      </div>
      <p className="mt-3 max-w-[18rem] text-xs leading-relaxed text-ink-100">
        Select a unit, city or territory on the map to inspect its order of
        battle, infrastructure and political posture.
      </p>
      <div className="mt-6 grid w-full max-w-[18rem] grid-cols-3 gap-2 font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
        <div className="hairline border px-2 py-1.5 text-center">click</div>
        <div className="hairline border px-2 py-1.5 text-center">inspect</div>
        <div className="hairline border px-2 py-1.5 text-center">queue</div>
      </div>
    </div>
  );
}
