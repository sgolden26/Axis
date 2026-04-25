import type { Action, BreakdownItem, Outcome } from "@/types/decision";
import type { EventCategory, MoraleTrend, RegionIntel } from "@/types/intel";

export const SEVERITY_DIVISOR = 12.0;
export const CONTRIBUTION_DIVISOR = 8.0;
export const P_FLOOR = 0.05;
export const P_CEIL = 0.95;
export const SIGNIFICANT_DELTA = 0.015;

const CATEGORY_PHRASE: Record<EventCategory, [negative: string, positive: string]> = {
  protest: ["protest activity", "protest activity"],
  military_loss: ["recent military setbacks", "improving military posture"],
  economic_stress: ["economic stress", "easing economic stress"],
  political_instability: ["political instability", "political stabilisation"],
  nationalist_sentiment: ["subdued nationalist sentiment", "rising nationalist sentiment"],
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function trendSigned(trend: MoraleTrend): number {
  if (trend === "rising") return 1;
  if (trend === "declining") return -1;
  return 0;
}

function moraleLabel(moraleNorm: number): string {
  if (moraleNorm >= 0.4) return "high morale";
  if (moraleNorm <= -0.4) return "low morale";
  return "neutral morale";
}

function categoryLabel(category: EventCategory, contribution: number): string {
  const [neg, pos] = CATEGORY_PHRASE[category] ?? [category, category];
  return contribution < 0 ? neg : pos;
}

function phraseFor(item: BreakdownItem): string {
  if (item.delta === 0) return "";
  const sign = item.delta < 0 ? "−" : "+";
  const pct = Math.round(Math.abs(item.delta) * 100);
  return `${item.label} (${sign}${pct}%)`;
}

function buildExplanation(
  action: Action,
  region: RegionIntel,
  probability: number,
  breakdown: BreakdownItem[],
): string {
  const modifiers = breakdown
    .filter((b) => b.kind !== "base")
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 2);
  const pct = Math.round(probability * 100);
  const basePct = Math.round(action.base_rate * 100);
  if (modifiers.length === 0) {
    return `${action.name} in ${region.region_id}: ${pct}% (baseline).`;
  }
  let direction: string;
  if (Math.abs(probability - action.base_rate) < 0.005) direction = "Held at";
  else direction = probability < action.base_rate ? "Reduced" : "Boosted";
  const phrases = modifiers.map(phraseFor).filter(Boolean);
  const joined = phrases.join(" and ");
  return joined
    ? `${direction} from ${basePct}% baseline to ${pct}% by ${joined}.`
    : `${action.name}: ${pct}%.`;
}

export function evaluate(action: Action, region: RegionIntel): Outcome {
  const moraleNorm = (region.morale_score - 50) / 50;
  const pMorale = moraleNorm * action.morale_weight;

  const tSigned = trendSigned(region.morale_trend);
  const pTrend = tSigned * action.trend_weight;

  const severitySum = region.drivers.reduce((acc, d) => acc + d.contribution, 0);
  const severityNorm = clamp(severitySum / SEVERITY_DIVISOR, -1, 1);
  const pSeverity = severityNorm * action.severity_weight;

  const categoryItems: BreakdownItem[] = [];
  for (const d of region.drivers) {
    const sensitivity = action.category_sensitivities[d.category] ?? 0;
    if (sensitivity === 0) continue;
    const intensity = clamp(Math.abs(d.contribution) / CONTRIBUTION_DIVISOR, 0, 1);
    const delta = sensitivity * intensity;
    if (Math.abs(delta) < SIGNIFICANT_DELTA) continue;
    categoryItems.push({
      label: categoryLabel(d.category, d.contribution),
      kind: "category",
      delta,
    });
  }

  const pCategories = categoryItems.reduce((a, b) => a + b.delta, 0);
  const raw = action.base_rate + pMorale + pTrend + pSeverity + pCategories;
  const probability = clamp(raw, P_FLOOR, P_CEIL);

  const breakdown: BreakdownItem[] = [
    { label: "base rate", kind: "base", delta: action.base_rate },
    { label: moraleLabel(moraleNorm), kind: "modifier", delta: pMorale },
  ];
  if (Math.abs(pTrend) >= SIGNIFICANT_DELTA) {
    breakdown.push({
      label: `${region.morale_trend} trend`,
      kind: "modifier",
      delta: pTrend,
    });
  }
  if (Math.abs(pSeverity) >= SIGNIFICANT_DELTA) {
    breakdown.push({
      label: "recent event severity",
      kind: "modifier",
      delta: pSeverity,
    });
  }
  breakdown.push(...categoryItems);

  const explanation = buildExplanation(action, region, probability, breakdown);

  return {
    action_id: action.id,
    region_id: region.region_id,
    probability,
    breakdown,
    explanation,
  };
}
