import type { GroundMoveMode } from "@/state/groundMove";
import type { PlayerTeam } from "@/state/playerTeam";
import type { OrderDTO, OrderBatchDTO } from "@/types/orders";

/** Discriminated union of staged orders sitting in the per-team cart.
 *
 *  Add new order kinds by extending this union and adding a corresponding
 *  builder + DTO mapping. The cart UI uses `kind` to dispatch row rendering.
 */
export type StagedOrder = StagedMoveOrder;

export interface StagedMoveOrder {
  id: string;
  kind: "move";
  team: PlayerTeam;
  unitId: string;
  mode: GroundMoveMode;
  origin: [number, number];
  destination: [number, number];
}

let _seq = 0;
export function newOrderId(prefix = "ord"): string {
  _seq += 1;
  return `${prefix}.${Date.now().toString(36)}.${_seq}`;
}

export function stagedOrderToDto(order: StagedOrder): OrderDTO {
  switch (order.kind) {
    case "move":
      return {
        order_id: order.id,
        kind: "move",
        unit_id: order.unitId,
        mode: order.mode,
        destination: order.destination,
      };
  }
}

export function batchFromStaged(
  team: PlayerTeam,
  orders: StagedOrder[],
): OrderBatchDTO {
  return { issuer_team: team, orders: orders.map(stagedOrderToDto) };
}

export function emptyTeamMap<T>(value: () => T): Record<PlayerTeam, T> {
  return { red: value(), blue: value() };
}
