import type { LayerSpecification } from "maplibre-gl";
import type { Faction, Unit } from "@/types/scenario";
import {
  LAYER_UNIT_DOT,
  LAYER_UNIT_HALO,
  SOURCE_UNITS,
} from "../style";

export const LAYER_UNIT_GLYPH = "axis-unit-glyph";

export interface UnitProps {
  id: string;
  name: string;
  faction_id: string;
  domain: Unit["domain"];
  kind: Unit["kind"];
  color: string;
  callsign: string;
  strength: number;
  glyph: string;
  domain_rank: number;
}

const KIND_GLYPH: Record<Unit["kind"], string> = {
  infantry_brigade: "I",
  armoured_brigade: "A",
  air_wing: "F",
  naval_task_group: "S",
};

const DOMAIN_RANK: Record<Unit["domain"], number> = {
  ground: 1,
  air: 2,
  naval: 3,
};

export function unitFeatureCollection(
  units: Unit[],
  factionsById: Map<string, Faction>,
): GeoJSON.FeatureCollection<GeoJSON.Point, UnitProps> {
  const features = units.map<GeoJSON.Feature<GeoJSON.Point, UnitProps>>((u) => ({
    type: "Feature",
    properties: {
      id: u.id,
      name: u.name,
      faction_id: u.faction_id,
      domain: u.domain,
      kind: u.kind,
      color: factionsById.get(u.faction_id)?.color ?? "#cccccc",
      callsign: u.callsign,
      strength: u.strength,
      glyph: KIND_GLYPH[u.kind],
      domain_rank: DOMAIN_RANK[u.domain],
    },
    geometry: { type: "Point", coordinates: u.position },
  }));
  return { type: "FeatureCollection", features };
}

export const unitHaloLayer: LayerSpecification = {
  id: LAYER_UNIT_HALO,
  type: "circle",
  source: SOURCE_UNITS,
  paint: {
    "circle-color": ["get", "color"],
    "circle-opacity": [
      "case",
      ["boolean", ["feature-state", "selected"], false], 0.55,
      ["boolean", ["feature-state", "hover"], false], 0.35,
      0.0,
    ],
    "circle-radius": 18,
    "circle-blur": 0.4,
  },
};

/**
 * Faction-coloured disc with a dark hairline stroke. Sized so the centred glyph
 * label reads at a glance even at low zoom.
 */
export const unitDotLayer: LayerSpecification = {
  id: LAYER_UNIT_DOT,
  type: "circle",
  source: SOURCE_UNITS,
  paint: {
    "circle-color": ["get", "color"],
    "circle-stroke-color": "#0b0f14",
    "circle-stroke-width": [
      "case",
      ["boolean", ["feature-state", "selected"], false], 2.5,
      1.4,
    ],
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      3, 7,
      6, 10,
      8, 13,
    ],
    "circle-opacity": 0.97,
  },
};

export const unitGlyphLayer: LayerSpecification = {
  id: LAYER_UNIT_GLYPH,
  type: "symbol",
  source: SOURCE_UNITS,
  layout: {
    "text-field": ["get", "glyph"],
    "text-font": ["Open Sans Semibold"],
    "text-size": [
      "interpolate",
      ["linear"],
      ["zoom"],
      3, 9,
      6, 11,
      8, 14,
    ],
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  },
  paint: {
    "text-color": "#ffffff",
    "text-halo-color": "#0b0f14",
    "text-halo-width": 1.0,
  },
};
