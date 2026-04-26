import { useMemo } from "react";
import { useAppStore } from "@/state/store";
import type { IntelEvent } from "@/types/intel";

const CATEGORY_GLYPH: Record<IntelEvent["category"], string> = {
  protest: "✦",
  military_loss: "☠",
  economic_stress: "₿",
  political_instability: "⚠",
  nationalist_sentiment: "✷",
};

const CATEGORY_TONE: Record<IntelEvent["category"], string> = {
  protest: "text-accent-amber",
  military_loss: "text-accent-danger",
  economic_stress: "text-accent-amber",
  political_instability: "text-accent-amber",
  nationalist_sentiment: "text-ink-100",
};

export function EventTicker() {
  const intel = useAppStore((s) => s.intel);
  const paused = useAppStore((s) => s.tickerPaused);
  const setPaused = useAppStore((s) => s.setTickerPaused);
  const select = useAppStore((s) => s.select);
  const scenario = useAppStore((s) => s.scenario);

  const events = useMemo(() => {
    if (!intel) return [] as IntelEvent[];
    const all: IntelEvent[] = [];
    for (const r of intel.regions) all.push(...r.recent_events);
    return all
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, 24);
  }, [intel]);

  const oblastIds = useMemo(
    () => new Set((scenario?.oblasts ?? []).map((o) => o.id)),
    [scenario],
  );
  const territoryIds = useMemo(
    () => new Set((scenario?.territories ?? []).map((t) => t.id)),
    [scenario],
  );

  const onClickEvent = (ev: IntelEvent) => {
    if (oblastIds.has(ev.region_id)) select({ kind: "oblast", id: ev.region_id });
    else if (territoryIds.has(ev.region_id))
      select({ kind: "territory", id: ev.region_id });
  };

  return (
    <div className="hairline-t flex h-9 items-center gap-3 bg-ink-900/95 px-3">
      <button
        onClick={() => setPaused(!paused)}
        className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200 hover:text-ink-50"
        title="Pause ticker"
      >
        {paused ? "▶" : "‖"}
      </button>
      <span className="font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
        ticker · {intel?.source ?? "—"}
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div
          className={`flex gap-6 whitespace-nowrap font-mono text-[11px] text-ink-100 ${
            paused ? "" : "animate-ticker"
          }`}
          style={{ minWidth: "200%" }}
        >
          {[...events, ...events].map((ev, i) => (
            <button
              key={`${ev.id}-${i}`}
              onClick={() => onClickEvent(ev)}
              className="flex shrink-0 items-center gap-2 hover:text-ink-50"
            >
              <span className={CATEGORY_TONE[ev.category]}>
                {CATEGORY_GLYPH[ev.category]}
              </span>
              <span className="text-ink-200">[{ev.region_id}]</span>
              <span>{ev.headline}</span>
              <span className="text-ink-300">· {ev.source}</span>
            </button>
          ))}
          {events.length === 0 && (
            <span className="text-ink-300">no signals on the wire</span>
          )}
        </div>
      </div>
    </div>
  );
}
