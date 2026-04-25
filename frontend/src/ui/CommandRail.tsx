import { ALL_LAYERS, useAppStore, type LayerKey } from "@/state/store";
import { CHOROPLETH_METRICS, type ChoroplethMetric } from "@/types/country";

const LAYER_LABEL: Record<LayerKey, string> = {
  territory: "Territory",
  cities: "Cities",
  units_ground: "Ground",
  units_air: "Air",
  units_naval: "Naval",
  country_choropleth: "Country",
  country_bases: "Bases",
};

const LAYER_GLYPH: Record<LayerKey, string> = {
  territory: "▰",
  cities: "◉",
  units_ground: "▲",
  units_air: "◆",
  units_naval: "■",
  country_choropleth: "◐",
  country_bases: "✦",
};

export function CommandRail() {
  const scenario = useAppStore((s) => s.scenario);
  const visible = useAppStore((s) => s.visibleLayers);
  const toggle = useAppStore((s) => s.toggleLayer);
  const choroplethMetric = useAppStore((s) => s.choroplethMetric);
  const setChoroplethMetric = useAppStore((s) => s.setChoroplethMetric);

  return (
    <nav className="hairline-r flex h-full w-[72px] flex-col items-stretch bg-ink-800">
      <div className="hairline-b py-2 text-center font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
        layers
      </div>
      <ul className="flex flex-col">
        {ALL_LAYERS.map((key) => (
          <li key={key}>
            <button
              onClick={() => toggle(key)}
              className={`group flex w-full flex-col items-center gap-1 px-1 py-2.5 transition-colors ${
                visible[key]
                  ? "text-ink-50"
                  : "text-ink-300 hover:text-ink-100"
              }`}
              title={LAYER_LABEL[key]}
              aria-pressed={visible[key]}
            >
              <span className="font-mono text-base leading-none">
                {LAYER_GLYPH[key]}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider2">
                {LAYER_LABEL[key]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {visible.country_choropleth && (
        <div className="hairline-t px-2 py-2">
          <div className="mb-1 text-center font-mono text-[8px] uppercase tracking-wider2 text-ink-200">
            metric
          </div>
          <select
            value={choroplethMetric}
            onChange={(e) => setChoroplethMetric(e.target.value as ChoroplethMetric)}
            className="w-full bg-ink-700 px-1 py-1 font-mono text-[9px] uppercase tracking-wider2 text-ink-50 outline-none border border-ink-500 focus:border-ink-300"
          >
            {CHOROPLETH_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-auto">
        <div className="hairline-t hairline-b py-2 text-center font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
          factions
        </div>
        <ul className="flex flex-col gap-2 px-2 py-3">
          {scenario?.factions.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider2 text-ink-100"
              title={f.name}
            >
              <span
                className="inline-block h-2 w-2"
                style={{ background: f.color }}
              />
              <span className="truncate">{f.id}</span>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
