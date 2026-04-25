import type { Outcome } from "@/types/decision";

interface Props {
  outcome: Outcome;
}

function probTone(p: number): string {
  if (p >= 0.7) return "var(--accent-ok)";
  if (p >= 0.45) return "var(--ink-50)";
  if (p >= 0.25) return "var(--accent-amber)";
  return "var(--accent-danger)";
}

export function OutcomeCard({ outcome }: Props) {
  const pct = Math.round(outcome.probability * 100);
  const color = probTone(outcome.probability);

  return (
    <div className="hairline-t px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
          estimated success
        </span>
        <span className="font-mono text-[28px] leading-none" style={{ color }}>
          {pct}%
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {outcome.breakdown.map((item, idx) => (
          <BreakdownRow key={idx} item={item} />
        ))}
      </div>

      <div className="mt-3 border-l-2 border-ink-400 pl-3 text-[12px] leading-snug text-ink-100">
        {outcome.explanation}
      </div>
    </div>
  );
}

function BreakdownRow({ item }: { item: Outcome["breakdown"][number] }) {
  const isBase = item.kind === "base";
  const positive = item.delta >= 0;
  const pct = (Math.abs(item.delta) * 100).toFixed(1);
  const sign = isBase ? "" : positive ? "+" : "−";
  const fillColor = isBase
    ? "var(--ink-300)"
    : positive
      ? "var(--accent-ok)"
      : "var(--accent-danger)";
  const widthPct = Math.min(100, Math.abs(item.delta) * 100 * 1.2);

  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider2">
        <span className="text-ink-200">{item.label}</span>
        <span className="text-ink-50">
          {sign}
          {pct}%
        </span>
      </div>
      <div className="h-[3px] w-full bg-ink-600">
        <div
          className="h-full"
          style={{ width: `${widthPct}%`, background: fillColor }}
        />
      </div>
    </div>
  );
}
