import type { Faction, Territory } from "@/types/scenario";
import { SectionHeader } from "./primitives/SectionHeader";
import { KeyValueRow } from "./primitives/KeyValueRow";
import { MetricBar } from "./primitives/MetricBar";
import { FactionTag } from "./primitives/FactionTag";

interface Props {
  territory: Territory;
  faction: Faction;
}

export function TerritoryDetail({ territory, faction }: Props) {
  const points = territory.polygon.reduce((acc, ring) => acc + ring.length, 0);
  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b px-4 pb-3 pt-4">
        <div className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
          territory
        </div>
        <div className="mt-1 text-lg font-semibold text-ink-50">{territory.name}</div>
        <div className="mt-2 flex items-center gap-2">
          <FactionTag faction={faction} />
          <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
            {territory.id}
          </span>
        </div>
      </div>

      <SectionHeader label="control" />
      <MetricBar label="effective control" value={territory.control} />

      <SectionHeader label="geometry" />
      <KeyValueRow label="rings" value={territory.polygon.length} />
      <KeyValueRow label="vertices" value={points} />

      <SectionHeader label="political posture" trailing="stub" />
      <div className="px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-100">
        Local sentiment, protest activity and partisan dispersion will surface
        here once the intel layer is online.
      </div>
    </div>
  );
}
