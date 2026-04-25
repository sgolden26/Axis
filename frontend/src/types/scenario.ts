import { z } from "zod";
import { actionSchema } from "./decision";
import { countrySchema } from "./country";

export const allegianceSchema = z.enum(["blue", "red", "neutral"]);
export type Allegiance = z.infer<typeof allegianceSchema>;

export const unitDomainSchema = z.enum(["ground", "air", "naval"]);
export type UnitDomain = z.infer<typeof unitDomainSchema>;

export const unitKindSchema = z.enum([
  "infantry_brigade",
  "armoured_brigade",
  "air_wing",
  "naval_task_group",
]);
export type UnitKind = z.infer<typeof unitKindSchema>;

export const cityImportanceSchema = z.enum(["capital", "major", "minor"]);
export type CityImportance = z.infer<typeof cityImportanceSchema>;

const lonLat = z.tuple([z.number(), z.number()]);
const bbox = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const factionSchema = z.object({
  id: z.string(),
  name: z.string(),
  allegiance: allegianceSchema,
  color: z.string(),
});
export type Faction = z.infer<typeof factionSchema>;

export const citySchema = z.object({
  id: z.string(),
  name: z.string(),
  faction_id: z.string(),
  position: lonLat,
  population: z.number().nonnegative(),
  importance: cityImportanceSchema,
  infrastructure: z.array(z.string()).default([]),
  country_id: z.string().nullable().optional(),
});
export type City = z.infer<typeof citySchema>;

export const territorySchema = z.object({
  id: z.string(),
  name: z.string(),
  faction_id: z.string(),
  polygon: z.array(z.array(lonLat)),
  control: z.number().min(0).max(1),
  country_id: z.string().nullable().optional(),
});
export type Territory = z.infer<typeof territorySchema>;

export const unitSchema = z.object({
  id: z.string(),
  name: z.string(),
  faction_id: z.string(),
  domain: unitDomainSchema,
  kind: unitKindSchema,
  position: lonLat,
  strength: z.number().min(0).max(1),
  readiness: z.number().min(0).max(1),
  morale: z.number().min(0).max(1),
  echelon: z.string(),
  callsign: z.string(),
  country_id: z.string().nullable().optional(),
  available_actions: z.array(z.string()).default([]),
});
export type Unit = z.infer<typeof unitSchema>;

export const scenarioMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  classification: z.string(),
  clock: z.string(),
  bbox: bbox,
});
export type ScenarioMeta = z.infer<typeof scenarioMetaSchema>;

export const scenarioSnapshotSchema = z.object({
  schema_version: z.string(),
  scenario: scenarioMetaSchema,
  factions: z.array(factionSchema),
  countries: z.array(countrySchema).default([]),
  cities: z.array(citySchema),
  territories: z.array(territorySchema),
  units: z.array(unitSchema),
  actions: z.array(actionSchema).default([]),
});
export type ScenarioSnapshot = z.infer<typeof scenarioSnapshotSchema>;

export type SelectableKind = "city" | "territory" | "unit" | "country";

export type Selection =
  | { kind: "city"; id: string }
  | { kind: "territory"; id: string }
  | { kind: "unit"; id: string }
  | { kind: "country"; id: string }
  | null;

export type { Country } from "./country";
