import { useAppStore } from "@/state/store";
import type { Faction, FactionPressure } from "@/types/scenario";

/**
 * Always-visible strip beneath the HUD showing:
 * - the global deadline countdown (turns remaining),
 * - one pip per faction with seeded pressure: faction colour, intensity bar,
 *   and per-faction T-N if that faction has its own deadline.
 */
export function PoliticalStrip() {
  const scenario = useAppStore((s) => s.scenario);
  if (!scenario) return null;

  const pressure = scenario.pressure;
  const factionsById = new Map<string, Faction>();
  for (const f of scenario.factions) factionsById.set(f.id, f);

  const factionPressures = pressure.factions.filter((fp) => factionsById.has(fp.faction_id));
  if (factionPressures.length === 0 && pressure.global_deadline_turn == null) {
    return null;
  }

  const globalRemaining =
    pressure.global_deadline_turn != null
      ? Math.max(0, pressure.global_deadline_turn - scenario.current_turn)
      : null;

  return (
    <div className="hairline-b flex h-8 shrink-0 items-stretch bg-ink-800/95">
      <div className="flex items-center gap-3 px-4 font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
        <span>turn · {scenario.current_turn}</span>
        {globalRemaining != null && (
          <>
            <span className="text-ink-300">·</span>
            <CountdownPill
              label="campaign deadline"
              remaining={globalRemaining}
              total={pressure.global_deadline_turn ?? 0}
            />
          </>
        )}
      </div>

      <div className="hairline-l flex min-w-0 flex-1 items-center gap-4 overflow-x-auto px-4">
        {factionPressures.map((fp) => {
          const faction = factionsById.get(fp.faction_id);
          if (!faction) return null;
          return (
            <FactionPressurePip
              key={fp.faction_id}
              faction={faction}
              pressure={fp}
              currentTurn={scenario.current_turn}
            />
          );
        })}
      </div>
    </div>
  );
}

function CountdownPill({
  label,
  remaining,
  total,
}: {
  label: string;
  remaining: number;
  total: number;
}) {
  const tone =
    remaining <= 2
      ? "text-accent-danger"
      : remaining <= 5
        ? "text-accent-amber"
        : "text-ink-100";
  return (
    <span className={`font-mono ${tone}`} title={`${remaining} of ${total} turns remaining`}>
      {label} · T-{remaining}
    </span>
  );
}

function FactionPressurePip({
  faction,
  pressure,
  currentTurn,
}: {
  faction: Faction;
  pressure: FactionPressure;
  currentTurn: number;
}) {
  const pct = Math.round(pressure.intensity * 100);
  const remaining =
    pressure.deadline_turn != null
      ? Math.max(0, pressure.deadline_turn - currentTurn)
      : null;
  const driverTitle =
    pressure.drivers.length > 0
      ? `Drivers:\n• ${pressure.drivers.join("\n• ")}`
      : "";

  return (
    <div
      className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider2"
      title={driverTitle}
    >
      <span style={{ color: faction.color }} className="font-semibold">
        {faction.name}
      </span>
      <div className="h-1.5 w-24 bg-ink-700">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: faction.color }}
        />
      </div>
      <span className="text-ink-100">{pct}%</span>
      {remaining != null && (
        <span
          className={`text-[9px] ${
            remaining <= 2
              ? "text-accent-danger"
              : remaining <= 5
                ? "text-accent-amber"
                : "text-ink-200"
          }`}
        >
          T-{remaining}
        </span>
      )}
    </div>
  );
}
