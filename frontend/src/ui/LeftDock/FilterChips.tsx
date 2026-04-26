import { useAppStore, type LayerKey } from "@/state/store";

const LAYER_LABEL: Record<LayerKey, string> = {
  oblasts: "Regions",
  cities: "Cities",
  units_ground: "Ground",
  units_air: "Air",
  units_naval: "Naval",
  depots: "Depots",
  airfields: "Airfields",
  naval_bases: "Naval bases",
  border_crossings: "Crossings",
  supply_lines: "Supply",
  frontline: "Front",
};

const GROUPS: { label: string; keys: LayerKey[] }[] = [
  { label: "world", keys: ["oblasts", "cities", "frontline"] },
  { label: "forces", keys: ["units_ground", "units_air", "units_naval"] },
  {
    label: "logistics",
    keys: ["supply_lines", "depots", "airfields", "naval_bases", "border_crossings"],
  },
];

export function FilterChips() {
  const visible = useAppStore((s) => s.visibleLayers);
  const toggle = useAppStore((s) => s.toggleLayer);

  return (
    <div className="px-3 py-2 space-y-2">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
            {group.label}
          </div>
          <div className="flex flex-wrap gap-1">
            {group.keys.map((key) => {
              const active = visible[key];
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider2 transition-colors ${
                    active
                      ? "border-ink-300 bg-ink-700 text-ink-50"
                      : "border-ink-600 text-ink-300 hover:border-ink-400 hover:text-ink-100"
                  }`}
                  aria-pressed={active}
                  title={LAYER_LABEL[key]}
                >
                  {LAYER_LABEL[key]}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
