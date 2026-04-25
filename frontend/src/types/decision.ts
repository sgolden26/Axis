import { z } from "zod";
import { eventCategorySchema } from "./intel";

export const actionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  base_rate: z.number().min(0).max(1),
  morale_weight: z.number(),
  trend_weight: z.number(),
  severity_weight: z.number(),
  category_sensitivities: z.record(eventCategorySchema, z.number()).default({}),
});
export type Action = z.infer<typeof actionSchema>;

export type BreakdownKind = "base" | "modifier" | "category";

export interface BreakdownItem {
  label: string;
  kind: BreakdownKind;
  delta: number;
}

export interface Outcome {
  action_id: string;
  region_id: string;
  probability: number;
  breakdown: BreakdownItem[];
  explanation: string;
}
