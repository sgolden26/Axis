import type { Faction, Unit } from "@/types/scenario";
import { useAppStore } from "@/state/store";
import { isGroundCombatUnit, type GroundMoveMode } from "@/state/groundMove";
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

const MOVE_ACTIONS: { mode: GroundMoveMode; label: string }[] = [
  { mode: "foot", label: "Move by foot" },
  { mode: "vehicle", label: "Move via off-road vehicle" },
];

export function UnitDetail({ unit, faction }: Props) {
  const groundMoveDrafts = useAppStore((s) => s.groundMoveDrafts);
  const startGroundMove = useAppStore((s) => s.startGroundMove);
  const confirmGroundMovePicking = useAppStore((s) => s.confirmGroundMovePicking);
  const cancelGroundMove = useAppStore((s) => s.cancelGroundMove);

  const draft = groundMoveDrafts[unit.id];
  const showGroundMoves = isGroundCombatUnit(unit.domain);
  const actionCount = unit.available_actions.length + (showGroundMoves ? MOVE_ACTIONS.length : 0);

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

      <SectionHeader label="available actions" trailing={`${actionCount}`} />
      {actionCount === 0 ? (
        <div className="px-4 py-3 font-mono text-[11px] text-ink-200">
          no affordances declared
        </div>
      ) : (
        <div className="px-3 py-2">
          <div className="grid grid-cols-2 gap-1.5">
            {showGroundMoves &&
              MOVE_ACTIONS.map(({ mode, label }) => {
                const active = draft?.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => startGroundMove(unit.id, mode)}
                    title={`Plan movement (${mode})`}
                    className={`hairline border px-2 py-1.5 text-left font-mono text-[10px] uppercase tracking-wider2 transition-colors ${
                      active
                        ? "border-faction-nato bg-ink-700 text-ink-50"
                        : "border-ink-500 bg-ink-800 text-ink-100 hover:border-ink-300 hover:text-ink-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
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
          {draft && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {draft.pickingDestination && (
                <button
                  type="button"
                  disabled={!draft.destination}
                  title={
                    draft.destination
                      ? "Finish choosing on the map; you can then select oblasts and other features again."
                      : "Click the map inside the movement range to set a destination first."
                  }
                  onClick={() => confirmGroundMovePicking(unit.id)}
                  className="hairline border border-accent-ok bg-accent-ok/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider2 text-accent-ok transition-colors hover:bg-accent-ok/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent-ok/10"
                >
                  Select destination
                </button>
              )}
              <button
                type="button"
                onClick={() => cancelGroundMove(unit.id)}
                className="hairline border border-accent-danger bg-accent-danger/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider2 text-accent-danger transition-colors hover:bg-accent-danger/20"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
