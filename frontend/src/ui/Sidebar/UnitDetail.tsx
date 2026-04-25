import type { Faction, Unit } from "@/types/scenario";
import { SectionHeader } from "./primitives/SectionHeader";
import { KeyValueRow } from "./primitives/KeyValueRow";
import { MetricBar } from "./primitives/MetricBar";
import { FactionTag } from "./primitives/FactionTag";

interface Props {
  unit: Unit;
  faction: Faction;
}

const KIND_LABEL: Record<Unit["kind"], string> = {
  infantry_brigade: "Infantry Brigade",
  armoured_brigade: "Armoured Brigade",
  air_wing: "Air Wing",
  naval_task_group: "Naval Task Group",
};

export function UnitDetail({ unit, faction }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b px-4 pb-3 pt-4">
        <div className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
          unit · {unit.domain} · {unit.echelon}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-ink-50">{unit.name}</span>
          {unit.callsign && (
            <span className="font-mono text-[11px] text-ink-200">/{unit.callsign}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <FactionTag faction={faction} />
          <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
            {unit.id}
          </span>
        </div>
      </div>

      <SectionHeader label="classification" />
      <KeyValueRow label="kind" value={KIND_LABEL[unit.kind]} mono={false} />
      <KeyValueRow label="domain" value={unit.domain.toUpperCase()} />
      <KeyValueRow label="echelon" value={unit.echelon.toUpperCase()} />

      <SectionHeader label="combat power" />
      <MetricBar label="strength" value={unit.strength} />
      <MetricBar label="readiness" value={unit.readiness} />
      <MetricBar label="morale" value={unit.morale} />

      <SectionHeader label="position" />
      <KeyValueRow
        label="lat / lon"
        value={`${unit.position[1].toFixed(3)}°N  ${unit.position[0].toFixed(3)}°E`}
      />

      <SectionHeader label="orders" trailing="stub" />
      <div className="px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-100">
        Movement and engagement orders will be issued here once the simulation
        engine is online.
      </div>
    </div>
  );
}
