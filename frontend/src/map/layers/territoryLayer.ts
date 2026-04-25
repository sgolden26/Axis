import type { LayerSpecification } from "maplibre-gl";
import type { Faction, Territory } from "@/types/scenario";
import {
  LAYER_TERRITORY_FILL,
  LAYER_TERRITORY_LINE,
  SOURCE_TERRITORIES,
} from "../style";

export function territoryFeatureCollection(
  territories: Territory[],
  factionsById: Map<string, Faction>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, TerritoryProps> {
  const features = territories.map<GeoJSON.Feature<GeoJSON.Polygon, TerritoryProps>>(
    (t) => ({
      type: "Feature",
      properties: {
        id: t.id,
        name: t.name,
        faction_id: t.faction_id,
        color: factionsById.get(t.faction_id)?.color ?? "#888888",
        control: t.control,
      },
      geometry: { type: "Polygon", coordinates: t.polygon },
    }),
  );
  return { type: "FeatureCollection", features };
}

export interface TerritoryProps {
  id: string;
  name: string;
  faction_id: string;
  color: string;
  control: number;
}

export const territoryFillLayer: LayerSpecification = {
  id: LAYER_TERRITORY_FILL,
  type: "fill",
  source: SOURCE_TERRITORIES,
  paint: {
    "fill-color": ["get", "color"],
    "fill-opacity": [
      "case",
      ["boolean", ["feature-state", "selected"], false], 0.28,
      ["boolean", ["feature-state", "hover"], false], 0.20,
      0.12,
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
