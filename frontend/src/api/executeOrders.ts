import {
  executionResultSchema,
  type ExecutionResultDTO,
  type OrderBatchDTO,
} from "@/types/orders";

/** POST an OrderBatch to the live theatre service.
 *
 *  Throws on transport failure; returns an `ExecutionResultDTO` (which may
 *  carry `ok=false` when individual orders failed validation but the request
 *  was well-formed).
 */
export async function executeOrders(
  batch: OrderBatchDTO,
  url = "/api/orders/execute",
): Promise<ExecutionResultDTO> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (json as { detail?: string }).detail ?? `HTTP ${res.status}`;
    throw new Error(`executeOrders failed: ${detail}`);
  }
  const parsed = executionResultSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[orders] execution result schema mismatch", parsed.error.issues);
    throw new Error("Order execution response failed schema validation.");
  }
  return parsed.data;
}
