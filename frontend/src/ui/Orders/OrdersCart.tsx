import { useMemo } from "react";
import { useAppStore } from "@/state/store";
import type { StagedOrder } from "@/state/orders";
import type { Faction, Unit } from "@/types/scenario";
import { haversineKm } from "@/map/geodesic";

/** Top-right "Orders" cart. Renders the active team's staged orders and an
 *  Execute button. Hidden entirely when nothing is staged for that team and
 *  the cart is closed (no chrome noise). */
export function OrdersCart() {
  const playerTeam = useAppStore((s) => s.playerTeam);
  const orders = useAppStore((s) => s.stagedOrders[s.playerTeam]);
  const cartOpen = useAppStore((s) => s.cartOpen);
  const setCartOpen = useAppStore((s) => s.setCartOpen);
  const executing = useAppStore((s) => s.executing);
  const error = useAppStore((s) => s.orderExecutionError);
  const dismissError = useAppStore((s) => s.dismissOrderExecutionError);
  const removeOrder = useAppStore((s) => s.removeStagedOrder);
  const clearOrders = useAppStore((s) => s.clearStagedOrders);
  const executeStaged = useAppStore((s) => s.executeStagedOrders);
  const scenario = useAppStore((s) => s.scenario);
  const select = useAppStore((s) => s.select);

  const unitsById = useMemo(() => {
    const m = new Map<string, Unit>();
    if (!scenario) return m;
    for (const u of scenario.units) m.set(u.id, u);
    return m;
  }, [scenario]);

  const factionsById = useMemo(() => {
    const m = new Map<string, Faction>();
    if (!scenario) return m;
    for (const f of scenario.factions) m.set(f.id, f);
    return m;
  }, [scenario]);

  if (orders.length === 0 && !cartOpen && !error) return null;

  const teamColor =
    playerTeam === "blue" ? "text-faction-nato" : "text-faction-ru";
  const teamBorder =
    playerTeam === "blue" ? "border-faction-nato/60" : "border-faction-ru/60";
  const teamDot =
    playerTeam === "blue" ? "bg-faction-nato" : "bg-faction-ru";

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[60] flex w-72 flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setCartOpen(!cartOpen)}
        aria-expanded={cartOpen}
        className={`pointer-events-auto inline-flex items-center gap-2 hairline border ${teamBorder} bg-ink-800/95 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider2 shadow-lg transition-colors hover:bg-ink-700`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${teamDot}`} />
        <span className={teamColor}>orders</span>
        <span className="text-ink-100">·</span>
        <span className="text-ink-50">{orders.length}</span>
        <span className="text-ink-300">{cartOpen ? "▾" : "▸"}</span>
      </button>

      {cartOpen && (
        <div className="pointer-events-auto w-full hairline border bg-ink-800/95 shadow-xl">
          <div className={`hairline-b flex items-center justify-between px-3 py-2 ${teamColor}`}>
            <span className="font-mono text-[10px] uppercase tracking-wider2">
              staged · {playerTeam} team
            </span>
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              aria-label="Close orders"
              className="font-mono text-[12px] text-ink-200 hover:text-ink-50"
            >
              ×
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
              no orders staged. plan a unit move and click "add to orders".
            </div>
          ) : (
            <ul className="max-h-[40vh] overflow-y-auto">
              {orders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  unit={unitsById.get(o.kind === "move" ? o.unitId : "")}
                  faction={factionsById.get(
                    unitsById.get(o.kind === "move" ? o.unitId : "")?.faction_id ?? "",
                  )}
                  onSelect={() => {
                    if (o.kind === "move") {
                      select({ kind: "unit", id: o.unitId });
                    }
                  }}
                  onRemove={() => removeOrder(o.id)}
                  disabled={executing}
                />
              ))}
            </ul>
          )}

          {error && (
            <div className="hairline-t flex items-start gap-2 bg-accent-danger/10 px-3 py-2">
              <p className="flex-1 font-mono text-[10px] uppercase tracking-wider2 text-accent-danger whitespace-pre-line">
                {error}
              </p>
              <button
                type="button"
                onClick={dismissError}
                aria-label="Dismiss error"
                className="font-mono text-[11px] text-accent-danger hover:text-ink-50"
              >
                ×
              </button>
            </div>
          )}

          <div className="hairline-t flex items-center justify-between gap-2 px-3 py-2">
            <button
              type="button"
              disabled={executing || orders.length === 0}
              onClick={() => clearOrders(playerTeam)}
              className="hairline border border-ink-500 px-2 py-1 font-mono text-[9px] uppercase tracking-wider2 text-ink-200 transition-colors hover:border-ink-300 hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={executing || orders.length === 0}
              onClick={() => void executeStaged()}
              className="hairline border border-accent-ok bg-accent-ok/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider2 text-accent-ok transition-colors hover:bg-accent-ok/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent-ok/10"
            >
              {executing ? "Executing…" : `Execute (${orders.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrderRowProps {
  order: StagedOrder;
  unit: Unit | undefined;
  faction: Faction | undefined;
  onSelect: () => void;
  onRemove: () => void;
  disabled: boolean;
}

function OrderRow({ order, unit, faction, onSelect, onRemove, disabled }: OrderRowProps) {
  if (order.kind !== "move") return null;
  const distanceKm = haversineKm(order.origin, order.destination);
  const factionColor = faction?.color ?? "#888";

  return (
    <li className="hairline-b last:border-b-0 flex items-start gap-2 px-3 py-2">
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left"
        title="Show this unit on the map"
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0"
            style={{ backgroundColor: factionColor }}
          />
          <span className="text-[12px] font-semibold text-ink-50 truncate">
            {unit?.name ?? order.unitId}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2 font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
          <span>move · {order.mode}</span>
          <span className="text-ink-300">·</span>
          <span>{distanceKm.toFixed(1)} km</span>
        </div>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label="Remove order"
        className="shrink-0 hairline border border-ink-500 px-1.5 py-0.5 font-mono text-[11px] text-ink-200 transition-colors hover:border-accent-danger hover:text-accent-danger disabled:cursor-not-allowed disabled:opacity-40"
      >
        ×
      </button>
    </li>
  );
}
