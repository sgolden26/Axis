import type { LayerSpecification } from "maplibre-gl";
import type { Faction, Unit } from "@/types/scenario";
import {
  LAYER_UNIT_DOT,
  LAYER_UNIT_HALO,
  SOURCE_UNITS,
} from "../style";

export interface UnitProps {
  id: string;
  name: string;
  faction_id: string;
  domain: Unit["domain"];
  kind: Unit["kind"];
  color: string;
  callsign: string;
  strength: number;
}

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
      ["boolean", ["feature-state", "selected"], false], 0.45,
      ["boolean", ["feature-state", "hover"], false], 0.30,
      0.0,
    ],
    "circle-radius": 14,
  },
};

/**
 * MapLibre core has no shape switching for circles, so we render a coloured
 * tile-like marker as a circle plus a stroke; domain shape differentiation
 * lives in `unitDotLayer` via stroke patterns and dasharray for now. v2 will
 * swap these for SVG sprites (chevron / triangle / square).
 */
export const unitDotLayer: LayerSpecification = {
  id: LAYER_UNIT_DOT,
  type: "circle",
  source: SOURCE_UNITS,
  paint: {
    "circle-color": ["get", "color"],
    "circle-stroke-color": "#0b0f14",
    "circle-stroke-width": 1.5,
    "circle-radius": [
      "case",
      ["==", ["get", "domain"], "naval"], 7,
      ["==", ["get", "domain"], "air"], 6,
      5,
    ],
    "circle-opacity": 0.95,
  },
};
