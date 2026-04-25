import type { Faction, Unit } from "@/types/scenario";
import { SectionHeader } from "./primitives/SectionHeader";
import { KeyValueRow } from "./primitives/KeyValueRow";
import { MetricBar } from "./primitives/MetricBar";
import { FactionTag } from "./primitives/FactionTag";
import { CountryBadge } from "./primitives/CountryBadge";

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
      <div className="flex items-baseline justify-between px-4 py-1.5 text-xs">
        <span className="text-ink-200 uppercase tracking-wider2 text-[10px] font-mono">
          country
        </span>
        <CountryBadge countryId={unit.country_id ?? null} />
      </div>

      <SectionHeader label="combat power" />
      <MetricBar label="strength" value={unit.strength} />
      <MetricBar label="readiness" value={unit.readiness} />
      <MetricBar label="morale" value={unit.morale} />

      <SectionHeader label="position" />
      <KeyValueRow
        label="lat / lon"
        value={`${unit.position[1].toFixed(3)}°N  ${unit.position[0].toFixed(3)}°E`}
      />

      <SectionHeader
        label="available actions"
        trailing={`${unit.available_actions.length} · stub`}
      />
      {unit.available_actions.length === 0 ? (
        <div className="px-4 py-3 font-mono text-[11px] text-ink-200">
          no affordances declared
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 px-3 py-2">
          {unit.available_actions.map((a) => (
            <button
              key={a}
              disabled
              title="stub - execution not implemented"
              className="hairline border px-2 py-1.5 text-left font-mono text-[10px] uppercase tracking-wider2 text-ink-200 opacity-70"
            >
              {a.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
