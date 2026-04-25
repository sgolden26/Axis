import type { StyleSpecification } from "maplibre-gl";

/**
 * CARTO dark-matter raster tiles via the public xyz endpoint. Free, no API
 * key, attribution-required. We use raster (rather than vector) to keep the
 * runtime footprint small and avoid a glyphs/sprites dependency for v1.
 */
export const baseStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#070a0e" } },
    {
      id: "carto-dark",
      type: "raster",
      source: "carto-dark",
      paint: { "raster-opacity": 0.85, "raster-contrast": 0.05 },
    },
  ],
};

export const SOURCE_TERRITORIES = "axis-territories";
export const SOURCE_CITIES = "axis-cities";
export const SOURCE_UNITS = "axis-units";

export const LAYER_TERRITORY_FILL = "axis-territory-fill";
export const LAYER_TERRITORY_LINE = "axis-territory-line";
export const LAYER_CITY_HALO = "axis-city-halo";
export const LAYER_CITY_DOT = "axis-city-dot";
export const LAYER_CITY_LABEL = "axis-city-label";
export const LAYER_UNIT_HALO = "axis-unit-halo";
export const LAYER_UNIT_DOT = "axis-unit-dot";
