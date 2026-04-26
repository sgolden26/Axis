import { z } from "zod";
import { scenarioSnapshotSchema } from "./scenario";

export const playerTeamSchema = z.enum(["red", "blue"]);
export type PlayerTeamDTO = z.infer<typeof playerTeamSchema>;

export const groundMoveModeSchema = z.enum(["foot", "vehicle"]);
export type GroundMoveModeDTO = z.infer<typeof groundMoveModeSchema>;

const lonLat = z.tuple([z.number(), z.number()]);

export const moveOrderSchema = z.object({
  order_id: z.string(),
  kind: z.literal("move"),
  issuer_team: playerTeamSchema.optional(),
  unit_id: z.string(),
  mode: groundMoveModeSchema,
  destination: lonLat,
});
export type MoveOrderDTO = z.infer<typeof moveOrderSchema>;

/** Discriminated union; add new order kinds by extending this union. */
export const orderSchema = z.discriminatedUnion("kind", [moveOrderSchema]);
export type OrderDTO = z.infer<typeof orderSchema>;

export const orderBatchSchema = z.object({
  issuer_team: playerTeamSchema,
  orders: z.array(orderSchema),
});
export type OrderBatchDTO = z.infer<typeof orderBatchSchema>;

export const orderOutcomeSchema = z.object({
  order_id: z.string(),
  ok: z.boolean(),
  message: z.string(),
});
export type OrderOutcomeDTO = z.infer<typeof orderOutcomeSchema>;

export const executionResultSchema = z.object({
  ok: z.boolean(),
  outcomes: z.array(orderOutcomeSchema),
  snapshot: scenarioSnapshotSchema,
});
export type ExecutionResultDTO = z.infer<typeof executionResultSchema>;
