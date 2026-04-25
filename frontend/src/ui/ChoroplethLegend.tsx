import { useAppStore } from "@/state/store";
import { CHOROPLETH_METRICS } from "@/types/country";

export function ChoroplethLegend() {
  const on = useAppStore((s) => s.visibleLayers.country_choropleth);
  const metric = useAppStore((s) => s.choroplethMetric);
  if (!on) return null;

  const label =
    CHOROPLETH_METRICS.find((m) => m.id === metric)?.label ?? metric;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20">
      <div className="hairline border bg-ink-800/90 px-3 py-2">
        <div className="mb-1 font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
          country layer · {label}
        </div>
        <div
          className="h-2 w-44"
          style={{
            background:
              "linear-gradient(to right, #2a2f3a 0%, #5fc7c1 25%, #d6a45a 50%, #ff8b67 75%, #ff5a5a 100%)",
          }}
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
          <span>low</span>
          <span>high</span>
        </div>
      </div>
    </div>
  );
}
