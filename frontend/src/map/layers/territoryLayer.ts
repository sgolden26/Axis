import type { LayerSpecification } from "maplibre-gl";
import type { Faction, Territory } from "@/types/scenario";
import type { RegionIntel } from "@/types/intel";
import {
  LAYER_TERRITORY_FILL,
  LAYER_TERRITORY_LINE,
  SOURCE_TERRITORIES,
} from "../style";

export function territoryFeatureCollection(
  territories: Territory[],
  factionsById: Map<string, Faction>,
  intelById: Map<string, RegionIntel> = new Map(),
): GeoJSON.FeatureCollection<GeoJSON.Polygon, TerritoryProps> {
  const features = territories.map<GeoJSON.Feature<GeoJSON.Polygon, TerritoryProps>>(
    (t) => {
      const intel = intelById.get(t.id);
      const morale = intel?.morale_score ?? null;
      return {
        type: "Feature",
        properties: {
          id: t.id,
          name: t.name,
          faction_id: t.faction_id,
          color: factionsById.get(t.faction_id)?.color ?? "#888888",
          control: t.control,
          morale: morale ?? 50,
          has_morale: morale !== null ? 1 : 0,
          morale_trend: intel?.morale_trend ?? "steady",
        },
        geometry: { type: "Polygon", coordinates: t.polygon },
      };
    },
  );
  return { type: "FeatureCollection", features };
}

export interface TerritoryProps {
  id: string;
  name: string;
  faction_id: string;
  color: string;
  control: number;
  morale: number;
  has_morale: number;
  morale_trend: string;
}

export const territoryFillLayer: LayerSpecification = {
  id: LAYER_TERRITORY_FILL,
  type: "fill",
  source: SOURCE_TERRITORIES,
  paint: {
    "fill-color": [
      "case",
      ["==", ["get", "has_morale"], 0],
      ["get", "color"],
      // Map morale [0..100] -> red..amber..ink50..ok
      [
        "interpolate",
        ["linear"],
        ["get", "morale"],
        0, "#ff5a5a",
        30, "#d6a45a",
        50, "#aab4c2",
        70, "#5aa9ff",
        100, "#7ad492",
      ],
    ],
    "fill-opacity": [
      "case",
      ["boolean", ["feature-state", "selected"], false], 0.42,
      ["boolean", ["feature-state", "hover"], false], 0.30,
      // Lower morale -> stronger tint to make weak regions visually obvious
      [
        "interpolate",
        ["linear"],
        ["get", "morale"],
        0, 0.34,
        50, 0.18,
        100, 0.14,
      ],
    ],
  },
};

export const territoryLineLayer: LayerSpecification = {
  id: LAYER_TERRITORY_LINE,
  type: "line",
  source: SOURCE_TERRITORIES,
  paint: {
    "line-color": ["get", "color"],
    "line-width": [
      "case",
      ["boolean", ["feature-state", "selected"], false], 2.0,
      1.0,
    ],
    "line-opacity": 0.85,
  },
};
