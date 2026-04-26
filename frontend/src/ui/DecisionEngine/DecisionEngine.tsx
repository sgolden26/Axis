import { useMemo } from "react";
import { useAppStore } from "@/state/store";
import { evaluate } from "@/decision/evaluator";
import type { Action } from "@/types/decision";
import { ActionPicker } from "./ActionPicker";
import { OutcomeCard } from "./OutcomeCard";
import { RegionList } from "./RegionList";
import { RegionSummary } from "./RegionSummary";

export function DecisionEngine() {
  const scenario = useAppStore((s) => s.scenario);
  const intel = useAppStore((s) => s.intel);
  const intelError = useAppStore((s) => s.intelError);
  const lastIntelLoadAt = useAppStore((s) => s.lastIntelLoadAt);
  const selection = useAppStore((s) => s.selection);
  const select = useAppStore((s) => s.select);
  const selectedActionId = useAppStore((s) => s.selectedActionId);
  const selectAction = useAppStore((s) => s.selectAction);

  const territoriesById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof scenario>["territories"][number]>();
    if (scenario) {
      for (const t of scenario.territories) map.set(t.id, t);
    }
    return map;
  }, [scenario]);

  const factionsById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof scenario>["factions"][number]>();
    if (scenario) {
      for (const f of scenario.factions) map.set(f.id, f);
    }
    return map;
  }, [scenario]);

  const focusedRegionId =
    selection?.kind === "territory"
      ? selection.id
      : intel?.regions[0]?.region_id ?? null;

  const focusedRegion = useMemo(() => {
    if (!intel || !focusedRegionId) return null;
    return intel.regions.find((r) => r.region_id === focusedRegionId) ?? null;
  }, [intel, focusedRegionId]);

  const actions: Action[] = scenario?.actions ?? [];
  const selectedAction = useMemo(() => {
    return actions.find((a) => a.id === selectedActionId) ?? actions[0] ?? null;
  }, [actions, selectedActionId]);

  const outcome = useMemo(() => {
    if (!selectedAction || !focusedRegion) return null;
    return evaluate(selectedAction, focusedRegion);
  }, [selectedAction, focusedRegion]);

  return (
    <div className="flex h-full flex-col bg-ink-800">
      <div className="hairline-b flex items-center justify-between px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
          decision engine
        </span>
        <DecisionStatusBadge
          intelLoaded={Boolean(intel)}
          intelError={intelError}
          lastIntelLoadAt={lastIntelLoadAt}
          source={intel?.source ?? null}
          tickSeq={intel?.tick_seq ?? null}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {!scenario ? (
          <div className="px-4 py-8 text-center font-mono text-[11px] text-ink-200">
            waiting for scenario…
          </div>
        ) : !intel ? (
          <div className="px-4 py-8 text-center font-mono text-[11px] text-ink-200">
            {intelError ? (
              <span className="text-accent-danger">{intelError}</span>
            ) : (
              "loading intel feed…"
            )}
          </div>
        ) : (
          <>
            <RegionList
              regions={intel.regions}
              territoriesById={territoriesById}
              factionsById={factionsById}
              selectedRegionId={focusedRegionId}
              onSelect={(id) => {
                const oblast = scenario?.oblasts.find((o) => o.id === id);
                if (oblast) select({ kind: "oblast", id });
                else select({ kind: "territory", id });
              }}
            />

            {focusedRegion && territoriesById.get(focusedRegion.region_id) && (
              <RegionSummary
                region={focusedRegion}
                territory={territoriesById.get(focusedRegion.region_id)!}
                faction={
                  factionsById.get(
                    territoriesById.get(focusedRegion.region_id)!.faction_id,
                  )!
                }
              />
            )}

            {actions.length > 0 && (
              <ActionPicker
                actions={actions}
                selectedId={selectedAction?.id ?? null}
                onSelect={selectAction}
              />
            )}

            {outcome && <OutcomeCard outcome={outcome} />}
          </>
        )}
      </div>
    </div>
  );
}

function DecisionStatusBadge({
  intelLoaded,
  intelError,
  lastIntelLoadAt,
  source,
  tickSeq,
}: {
  intelLoaded: boolean;
  intelError: string | null;
  lastIntelLoadAt: number | null;
  source: string | null;
  tickSeq: number | null;
}) {
  if (intelError) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider2 text-accent-danger">
        offline
      </span>
    );
  }
  if (!intelLoaded) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
        warming up…
      </span>
    );
  }
  const ago = lastIntelLoadAt
    ? Math.max(0, Math.round((Date.now() - lastIntelLoadAt) / 1000))
    : 0;
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider2 text-accent-ok">
      live · {source ?? "?"}
      {tickSeq != null && tickSeq > 0 ? ` #${tickSeq}` : ""} · {ago}s
    </span>
  );
}
