import type { LayerSpecification } from "maplibre-gl";
import type { Feature } from "geojson";
import type {
  Airfield,
  BorderCrossing,
  Depot,
  Faction,
  NavalBase,
} from "@/types/scenario";

export const SOURCE_ASSETS = "axis-assets";
export const LAYER_ASSET_DOT = "axis-asset-dot";
export const LAYER_ASSET_LABEL = "axis-asset-label";

export type AssetKind = "depot" | "airfield" | "naval_base" | "border_crossing";

export interface AssetProps {
  id: string;
  name: string;
  kind: AssetKind;
  faction_id: string;
  color: string;
  glyph: string;
  kind_rank: number;
}

const GLYPHS: Record<AssetKind, string> = {
  depot: "D",
  airfield: "AF",
  naval_base: "NB",
  border_crossing: "BX",
};

const KIND_RANK: Record<AssetKind, number> = {
  airfield: 3,
  naval_base: 2,
  depot: 1,
  border_crossing: 0,
};

export function assetFeatureCollection(
  depots: Depot[],
  airfields: Airfield[],
  naval: NavalBase[],
  crossings: BorderCrossing[],
  factionsById: Map<string, Faction>,
): GeoJSON.FeatureCollection<GeoJSON.Point, AssetProps> {
  const features: Feature<GeoJSON.Point, AssetProps>[] = [];
  const push = (
    id: string,
    name: string,
    kind: AssetKind,
    factionId: string,
    pos: [number, number],
  ) => {
    const color = factionsById.get(factionId)?.color ?? "#aab4c2";
    features.push({
      type: "Feature",
      properties: {
        id,
        name,
        kind,
        faction_id: factionId,
        color,
        glyph: GLYPHS[kind],
        kind_rank: KIND_RANK[kind],
      },
      geometry: { type: "Point", coordinates: pos },
    });
  };
  for (const d of depots) push(d.id, d.name, "depot", d.faction_id, d.position);
  for (const a of airfields) push(a.id, a.name, "airfield", a.faction_id, a.position);
  for (const n of naval) push(n.id, n.name, "naval_base", n.faction_id, n.position);
  for (const c of crossings)
    push(c.id, c.name, "border_crossing", c.faction_id, c.position);
  return { type: "FeatureCollection", features };
}

/**
 * Assets read as anchored points: hollow dark core with a faction ring, sized
 * smaller than units so they do not compete visually.
 */
export const assetDotLayer: LayerSpecification = {
  id: LAYER_ASSET_DOT,
  type: "circle",
  source: SOURCE_ASSETS,
  paint: {
    "circle-color": "#0b0f14",
    "circle-stroke-color": ["get", "color"],
    "circle-stroke-width": [
      "case",
      ["boolean", ["feature-state", "selected"], false], 2.5,
      ["boolean", ["feature-state", "hover"], false], 2.0,
      1.6,
    ],
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      3, 3,
      6, 5,
      8, 7,
    ],
    "circle-opacity": 0.95,
  },
};

export const assetLabelLayer: LayerSpecification = {
  id: LAYER_ASSET_LABEL,
  type: "symbol",
  source: SOURCE_ASSETS,
  minzoom: 4.5,
  layout: {
    "text-field": ["get", "glyph"],
    "text-font": ["Open Sans Semibold"],
    "text-size": [
      "interpolate",
      ["linear"],
      ["zoom"],
      4.5, 8,
      6, 9,
      8, 11,
    ],
    "text-offset": [0, 0.9],
    "text-anchor": "top",
    "text-allow-overlap": false,
    "text-ignore-placement": false,
  },
  paint: {
    "text-color": ["get", "color"],
    "text-halo-color": "#070a0e",
    "text-halo-width": 1.4,
  },
};
