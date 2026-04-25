import type { LayerSpecification } from "maplibre-gl";
import type { City, Faction } from "@/types/scenario";
import {
  LAYER_CITY_DOT,
  LAYER_CITY_HALO,
  LAYER_CITY_LABEL,
  SOURCE_CITIES,
} from "../style";

export interface CityProps {
  id: string;
  name: string;
  faction_id: string;
  color: string;
  importance: City["importance"];
  importance_rank: number;
}

const IMPORTANCE_RANK: Record<City["importance"], number> = {
  capital: 3,
  major: 2,
  minor: 1,
};

export function cityFeatureCollection(
  cities: City[],
  factionsById: Map<string, Faction>,
): GeoJSON.FeatureCollection<GeoJSON.Point, CityProps> {
  const features = cities.map<GeoJSON.Feature<GeoJSON.Point, CityProps>>((c) => ({
    type: "Feature",
    properties: {
      id: c.id,
      name: c.name,
      faction_id: c.faction_id,
      color: factionsById.get(c.faction_id)?.color ?? "#cccccc",
      importance: c.importance,
      importance_rank: IMPORTANCE_RANK[c.importance],
    },
    geometry: { type: "Point", coordinates: c.position },
  }));
  return { type: "FeatureCollection", features };
}

export const cityHaloLayer: LayerSpecification = {
  id: LAYER_CITY_HALO,
  type: "circle",
  source: SOURCE_CITIES,
  paint: {
    "circle-color": ["get", "color"],
    "circle-opacity": [
      "case",
      ["boolean", ["feature-state", "selected"], false], 0.35,
      ["boolean", ["feature-state", "hover"], false], 0.25,
      0.0,
    ],
    "circle-radius": [
      "interpolate", ["linear"], ["get", "importance_rank"],
      1, 10,
      3, 16,
    ],
  },
};

export const cityDotLayer: LayerSpecification = {
  id: LAYER_CITY_DOT,
  type: "circle",
  source: SOURCE_CITIES,
  paint: {
    "circle-color": "#0b0f14",
    "circle-stroke-color": ["get", "color"],
    "circle-stroke-width": [
      "case",
      ["==", ["get", "importance"], "capital"], 2.0,
      1.4,
    ],
    "circle-radius": [
      "interpolate", ["linear"], ["get", "importance_rank"],
      1, 3,
      2, 4.5,
      3, 6,
    ],
  },
};

export const cityLabelLayer: LayerSpecification = {
  id: LAYER_CITY_LABEL,
  type: "symbol",
  source: SOURCE_CITIES,
  filter: [">=", ["get", "importance_rank"], 2],
  layout: {
    "text-field": ["get", "name"],
    "text-font": ["Open Sans Regular"],
    "text-size": 11,
    "text-offset": [0.9, 0],
    "text-anchor": "left",
    "text-letter-spacing": 0.08,
    "text-allow-overlap": false,
  },
  paint: {
    "text-color": "#dde3ec",
    "text-halo-color": "#070a0e",
    "text-halo-width": 1.4,
  },
};
