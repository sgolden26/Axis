interface Props {
  label: string;
  value: number; // 0..1
  tone?: "neutral" | "ok" | "warn" | "danger";
}

const TONE_COLORS: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "var(--ink-100)",
  ok: "var(--accent-ok)",
  warn: "var(--accent-amber)",
  danger: "var(--accent-danger)",
};

function tonefor(value: number): NonNullable<Props["tone"]> {
  if (value >= 0.8) return "ok";
  if (value >= 0.6) return "neutral";
  if (value >= 0.4) return "warn";
  return "danger";
}

export function MetricBar({ label, value, tone }: Props) {
  const t = tone ?? tonefor(value);
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="px-4 py-2">
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider2">
        <span className="text-ink-200">{label}</span>
        <span className="text-ink-50">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1 w-full bg-ink-600">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: TONE_COLORS[t] }}
        />
      </div>
    </div>
  );
}
