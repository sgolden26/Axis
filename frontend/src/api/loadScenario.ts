import { scenarioSnapshotSchema, type ScenarioSnapshot } from "@/types/scenario";

export async function loadScenario(url = "/state.json"): Promise<ScenarioSnapshot> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const json = await res.json();
  const parsed = scenarioSnapshotSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[scenario] schema validation failed", parsed.error.issues);
    throw new Error(
      "Scenario JSON failed schema validation. See console for details.",
    );
  }
  return parsed.data;
}
