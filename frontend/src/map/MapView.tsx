import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap, MapGeoJSONFeature } from "maplibre-gl";
import { useAppStore, type LayerKey } from "@/state/store";
import type {
  ScenarioSnapshot,
  Selection,
  SelectableKind,
} from "@/types/scenario";
import { loadBorders, type BordersBundle } from "@/api/loadBorders";
import { setMapInstance } from "./mapRef";
import {
  baseStyle,
  LAYER_CITY_DOT,
  LAYER_CITY_HALO,
  LAYER_CITY_LABEL,
  LAYER_UNIT_DOT,
  LAYER_UNIT_HALO,
  SOURCE_CITIES,
  SOURCE_UNITS,
} from "./style";
import {
  cityDotLayer,
  cityFeatureCollection,
  cityHaloLayer,
  cityLabelLayer,
} from "./layers/cityLayer";
import {
  unitDotLayer,
  unitFeatureCollection,
  unitGlyphLayer,
  unitHaloLayer,
  LAYER_UNIT_GLYPH,
} from "./layers/unitLayer";
import {
  countryFeatureCollection,
  contextCountryCollection,
  countryFillLayer,
  countryLineLayer,
  contextFillLayer,
  contextLineLayer,
  LAYER_COUNTRY_FILL,
  LAYER_COUNTRY_LINE,
  LAYER_COUNTRY_CONTEXT_FILL,
  LAYER_COUNTRY_CONTEXT_LINE,
  SOURCE_COUNTRIES,
  SOURCE_COUNTRY_CONTEXT,
} from "./layers/countryLayer";
import {
  oblastFeatureCollection,
  oblastFillLayer,
  oblastLineLayer,
  oblastLabelLayer,
  LAYER_OBLAST_FILL,
  LAYER_OBLAST_LINE,
  LAYER_OBLAST_LABEL,
  SOURCE_OBLASTS,
} from "./layers/oblastLayer";
import {
  assetDotLayer,
  assetFeatureCollection,
  assetLabelLayer,
  LAYER_ASSET_DOT,
  LAYER_ASSET_LABEL,
  SOURCE_ASSETS,
} from "./layers/assetLayer";
import {
  frontlineBufferCollection,
  frontlineBufferLayer,
  frontlineLineCollection,
  frontlineLineLayer,
  LAYER_FRONTLINE_BUFFER,
  LAYER_FRONTLINE_LINE,
  SOURCE_FRONTLINE_BUFFER,
  SOURCE_FRONTLINE_LINE,
} from "./layers/frontlineLayer";
import {
  supplyDashLayer,
  supplyFeatureCollection,
  supplyLineLayer,
  LAYER_SUPPLY_DASH,
  LAYER_SUPPLY_LINE,
  SOURCE_SUPPLY,
} from "./layers/supplyLayer";

// Ordered top-most first. queryRenderedFeatures returns features in render order
// (top -> bottom); we keep this list aligned with the layer paint order in
// addOrUpdateData so the topmost hit (unit > city > asset > ... > country) wins.
const CLICKABLE_LAYERS = [
  LAYER_UNIT_GLYPH,
  LAYER_UNIT_DOT,
  LAYER_UNIT_HALO,
  LAYER_CITY_DOT,
  LAYER_CITY_HALO,
  LAYER_ASSET_LABEL,
  LAYER_ASSET_DOT,
  LAYER_FRONTLINE_LINE,
  LAYER_SUPPLY_DASH,
  LAYER_FRONTLINE_BUFFER,
  LAYER_OBLAST_FILL,
  LAYER_COUNTRY_FILL,
];

type HoverState = { source: string; id: string | number } | null;

const SOURCE_TO_KIND: Record<string, SelectableKind> = {
  [SOURCE_UNITS]: "unit",
  [SOURCE_CITIES]: "city",
  [SOURCE_OBLASTS]: "oblast",
  [SOURCE_FRONTLINE_LINE]: "frontline",
  [SOURCE_FRONTLINE_BUFFER]: "frontline",
  [SOURCE_SUPPLY]: "supply_line",
  [SOURCE_COUNTRIES]: "country",
};

const ASSET_KIND_TO_SELECTABLE: Record<string, SelectableKind> = {
  depot: "depot",
  airfield: "airfield",
  naval_base: "naval_base",
  border_crossing: "border_crossing",
};

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const hoverRef = useRef<HoverState>(null);
  const selectionRef = useRef<Selection>(null);

  const scenario = useAppStore((s) => s.scenario);
  const selection = useAppStore((s) => s.selection);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const select = useAppStore((s) => s.select);
  const setHover = useAppStore((s) => s.setHover);
  const measureActive = useAppStore((s) => s.measureActive);
  const pushMeasurePoint = useAppStore((s) => s.pushMeasurePoint);

  const [borders, setBorders] = useState<BordersBundle | null>(null);

  const oblastsOn = visibleLayers.oblasts;

  useEffect(() => {
    loadBorders().then(setBorders).catch((err) => {
      console.error("[borders] load failed", err);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseStyle,
      center: [33.0, 48.5],
      zoom: 4.6,
      attributionControl: { compact: true },
      hash: false,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "bottom-right",
    );
    mapRef.current = map;
    setMapInstance(map);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario || !borders) return;
    const apply = () => addOrUpdateData(map, scenario, borders);
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [scenario, borders]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario) return;

    const activeLayers = () => CLICKABLE_LAYERS.filter((l) => map.getLayer(l));

    const resolveFeature = (
      feat: MapGeoJSONFeature,
    ): { kind: SelectableKind; id: string } | null => {
      const id = feat.properties?.id as string | undefined;
      if (!id) return null;
      let kind: SelectableKind | undefined;
      if (feat.source === SOURCE_ASSETS) {
        const assetKind = String(feat.properties?.kind ?? "");
        kind = ASSET_KIND_TO_SELECTABLE[assetKind];
      } else {
        kind = SOURCE_TO_KIND[feat.source];
      }
      if (!kind) return null;
      return { kind, id };
    };

    // queryRenderedFeatures returns features in render order (top-most first),
    // so a unit drawn over a country fill wins over the country.
    const topFeature = (point: maplibregl.PointLike): MapGeoJSONFeature | null => {
      const features = map.queryRenderedFeatures(point, { layers: activeLayers() });
      return features[0] ?? null;
    };

    const onClick = (ev: maplibregl.MapMouseEvent) => {
      if (useAppStore.getState().measureActive) {
        pushMeasurePoint({ lon: ev.lngLat.lng, lat: ev.lngLat.lat });
        return;
      }
      const feat = topFeature(ev.point);
      if (!feat) {
        useAppStore.getState().clearSelection();
        return;
      }
      const resolved = resolveFeature(feat);
      if (!resolved) {
        useAppStore.getState().clearSelection();
        return;
      }
      select(resolved);
    };

    const onMouseMove = (ev: maplibregl.MapMouseEvent) => {
      if (useAppStore.getState().measureActive) return;
      const feat = topFeature(ev.point);
      if (!feat || feat.id == null) {
        if (hoverRef.current) {
          map.setFeatureState(hoverRef.current, { hover: false });
          hoverRef.current = null;
        }
        map.getCanvas().style.cursor = "";
        setHover(null);
        return;
      }
      map.getCanvas().style.cursor = "pointer";
      const next: HoverState = { source: feat.source, id: feat.id };
      if (
        hoverRef.current &&
        (hoverRef.current.source !== next.source || hoverRef.current.id !== next.id)
      ) {
        map.setFeatureState(hoverRef.current, { hover: false });
      }
      map.setFeatureState(next, { hover: true });
      hoverRef.current = next;

      const resolved = resolveFeature(feat);
      if (resolved) {
        setHover({ ...resolved, x: ev.point.x, y: ev.point.y });
      }
    };

    const onMouseOut = () => {
      if (hoverRef.current) {
        map.setFeatureState(hoverRef.current, { hover: false });
        hoverRef.current = null;
      }
      map.getCanvas().style.cursor = "";
      setHover(null);
    };

    map.on("click", onClick);
    map.on("mousemove", onMouseMove);
    map.on("mouseout", onMouseOut);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMouseMove);
      map.off("mouseout", onMouseOut);
    };
  }, [scenario, select, setHover, pushMeasurePoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario) return;

    const prev = selectionRef.current;
    if (prev) {
      const src = sourceForKind(prev.kind);
      if (src) map.setFeatureState({ source: src, id: prev.id }, { selected: false });
    }
    if (selection) {
      const src = sourceForKind(selection.kind);
      if (src) map.setFeatureState({ source: src, id: selection.id }, { selected: true });
      flyToSelection(map, scenario, selection, borders);
    }
    selectionRef.current = selection;
  }, [selection, scenario, borders]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario) return;
    const apply = () => applyLayerVisibility(map, visibleLayers);
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [visibleLayers, scenario, oblastsOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Quantised dash patterns + slow tick to keep MapLibre's finite line atlas bounded;
    // animating line-dasharray every frame with continuous values overflows it.
    const DASHES: [number, number][] = [
      [0.5, 1.5],
      [0.5, 1.7],
      [0.5, 1.9],
      [0.5, 2.1],
    ];
    let i = 0;
    const id = window.setInterval(() => {
      if (!map.getLayer(LAYER_SUPPLY_DASH)) return;
      map.setPaintProperty(LAYER_SUPPLY_DASH, "line-dasharray", DASHES[i]);
      i = (i + 1) % DASHES.length;
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = measureActive ? "crosshair" : "";
  }, [measureActive]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function sourceForKind(kind: NonNullable<Selection>["kind"]): string | null {
  switch (kind) {
    case "city":
      return SOURCE_CITIES;
    case "unit":
      return SOURCE_UNITS;
    case "oblast":
      return SOURCE_OBLASTS;
    case "supply_line":
      return SOURCE_SUPPLY;
    case "frontline":
      return SOURCE_FRONTLINE_LINE;
    case "country":
      return SOURCE_COUNTRIES;
    case "depot":
    case "airfield":
    case "naval_base":
    case "border_crossing":
      return SOURCE_ASSETS;
    case "territory":
    case "isr_coverage":
    case "missile_range":
    case "aor":
      return null;
  }
}

type Pos = [number, number];

function bboxOfRing(coords: Pos[]): [number, number, number, number] {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}

function bboxFromGeoJson(
  geom: GeoJSON.Geometry | undefined,
): [number, number, number, number] | null {
  if (!geom) return null;
  if (geom.type === "Polygon") {
    return bboxOfRing(geom.coordinates[0] as Pos[]);
  }
  if (geom.type === "MultiPolygon") {
    let bb: [number, number, number, number] | null = null;
    for (const poly of geom.coordinates) {
      const inner = bboxOfRing(poly[0] as Pos[]);
      bb = bb ? mergeBbox(bb, inner) : inner;
    }
    return bb;
  }
  if (geom.type === "LineString") {
    return bboxOfRing(geom.coordinates as Pos[]);
  }
  return null;
}

function mergeBbox(
  a: [number, number, number, number],
  b: [number, number, number, number],
): [number, number, number, number] {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

function flyToSelection(
  map: MlMap,
  scenario: ScenarioSnapshot,
  selection: NonNullable<Selection>,
  borders: BordersBundle | null,
) {
  const padding = { top: 80, bottom: 80, left: 320, right: 420 };
  const easeOpts = { duration: 600, padding };

  const easeToPoint = (pos: Pos, zoom = 7.2) =>
    map.easeTo({ center: pos, zoom: Math.max(zoom, map.getZoom()), duration: 600 });

  const fit = (bb: [number, number, number, number]) =>
    map.fitBounds(
      [
        [bb[0], bb[1]],
        [bb[2], bb[3]],
      ],
      { ...easeOpts, maxZoom: 7 },
    );

  switch (selection.kind) {
    case "city": {
      const c = scenario.cities.find((x) => x.id === selection.id);
      if (c) easeToPoint(c.position, 7.5);
      return;
    }
    case "unit": {
      const u = scenario.units.find((x) => x.id === selection.id);
      if (u) easeToPoint(u.position, 7.0);
      return;
    }
    case "depot":
    case "airfield":
    case "naval_base":
    case "border_crossing": {
      const arr =
        selection.kind === "depot"
          ? scenario.depots
          : selection.kind === "airfield"
            ? scenario.airfields
            : selection.kind === "naval_base"
              ? scenario.naval_bases
              : scenario.border_crossings;
      const a = arr.find((x) => x.id === selection.id);
      if (a) easeToPoint(a.position, 7.5);
      return;
    }
    case "oblast": {
      const o = scenario.oblasts.find((x) => x.id === selection.id);
      if (!o) return;
      if (borders) {
        const f = borders.admin1Ua.features.find(
          (x) => x.properties.iso_3166_2 === o.iso_3166_2,
        );
        const bb = bboxFromGeoJson(f?.geometry);
        if (bb) {
          fit(bb);
          return;
        }
      }
      if (o.centroid) easeToPoint(o.centroid, 6);
      return;
    }
    case "country": {
      const c = scenario.countries.find((x) => x.id === selection.id);
      if (!c || !borders) return;
      const f = borders.admin0Primary.features.find(
        (x) => x.properties.iso_a2 === c.iso_a2 || x.properties.iso_a3 === c.iso_a3,
      );
      const bb = bboxFromGeoJson(f?.geometry);
      if (bb) fit(bb);
      return;
    }
    case "supply_line": {
      const s = scenario.supply_lines.find((x) => x.id === selection.id);
      if (!s || s.path.length === 0) return;
      fit(bboxOfRing(s.path));
      return;
    }
    case "frontline": {
      const f = scenario.frontlines.find((x) => x.id === selection.id);
      if (!f || f.path.length === 0) return;
      fit(bboxOfRing(f.path));
      return;
    }
    case "territory":
    case "isr_coverage":
    case "missile_range":
    case "aor":
      return;
  }
}

function addOrUpdateData(
  map: MlMap,
  scenario: ScenarioSnapshot,
  borders: BordersBundle,
) {
  const factionsById = new Map(scenario.factions.map((f) => [f.id, f]));

  const cities = cityFeatureCollection(scenario.cities, factionsById);
  const units = unitFeatureCollection(scenario.units, factionsById);
  const countries = countryFeatureCollection(
    scenario.countries,
    factionsById,
    borders.admin0Primary,
    { enabled: false, metric: "war_support", countryById: new Map() },
  );
  const context = contextCountryCollection(borders.admin0Context);
  const oblasts = oblastFeatureCollection(
    scenario.oblasts,
    factionsById,
    borders.admin1Ua,
  );
  const assets = assetFeatureCollection(
    scenario.depots,
    scenario.airfields,
    scenario.naval_bases,
    scenario.border_crossings,
    factionsById,
  );
  const frontlineLine = frontlineLineCollection(scenario.frontlines);
  const frontlineBuf = frontlineBufferCollection(scenario.frontlines);
  const supply = supplyFeatureCollection(scenario.supply_lines, factionsById);

  upsertGeoJsonSource(map, SOURCE_COUNTRY_CONTEXT, context, false);
  upsertGeoJsonSource(map, SOURCE_COUNTRIES, withStringIds(countries));
  upsertGeoJsonSource(map, SOURCE_OBLASTS, withStringIds(oblasts));
  upsertGeoJsonSource(map, SOURCE_FRONTLINE_BUFFER, frontlineBuf);
  upsertGeoJsonSource(map, SOURCE_FRONTLINE_LINE, withStringIds(frontlineLine));
  upsertGeoJsonSource(map, SOURCE_SUPPLY, withStringIds(supply));
  upsertGeoJsonSource(map, SOURCE_CITIES, withStringIds(cities));
  upsertGeoJsonSource(map, SOURCE_UNITS, withStringIds(units));
  upsertGeoJsonSource(map, SOURCE_ASSETS, withStringIds(assets));

  // Layer order: bottom -> top.
  addLayerOnce(map, contextFillLayer);
  addLayerOnce(map, contextLineLayer);
  addLayerOnce(map, countryFillLayer);
  addLayerOnce(map, countryLineLayer);
  addLayerOnce(map, oblastFillLayer);
  addLayerOnce(map, oblastLineLayer);
  addLayerOnce(map, frontlineBufferLayer);
  addLayerOnce(map, supplyLineLayer);
  addLayerOnce(map, supplyDashLayer);
  addLayerOnce(map, frontlineLineLayer);
  addLayerOnce(map, oblastLabelLayer);
  addLayerOnce(map, assetDotLayer);
  addLayerOnce(map, assetLabelLayer);
  addLayerOnce(map, cityHaloLayer);
  addLayerOnce(map, cityDotLayer);
  addLayerOnce(map, cityLabelLayer);
  addLayerOnce(map, unitHaloLayer);
  addLayerOnce(map, unitDotLayer);
  addLayerOnce(map, unitGlyphLayer);
}

function addLayerOnce(map: MlMap, spec: maplibregl.LayerSpecification) {
  if (!map.getLayer(spec.id)) map.addLayer(spec);
}

function upsertGeoJsonSource(
  map: MlMap,
  id: string,
  data: GeoJSON.FeatureCollection,
  promoteId = true,
) {
  const existing = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }
  map.addSource(id, {
    type: "geojson",
    data,
    ...(promoteId ? { promoteId: "id" } : {}),
  });
}

function withStringIds<G extends GeoJSON.Geometry, P extends { id: string }>(
  fc: GeoJSON.FeatureCollection<G, P>,
): GeoJSON.FeatureCollection<G, P> {
  return {
    ...fc,
    features: fc.features.map((f) => ({ ...f, id: f.properties.id })),
  };
}

function applyLayerVisibility(map: MlMap, vis: Record<LayerKey, boolean>) {
  const set = (layerId: string, visible: boolean) => {
    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  };
  set(LAYER_OBLAST_FILL, vis.oblasts);
  set(LAYER_OBLAST_LINE, vis.oblasts);
  set(LAYER_OBLAST_LABEL, vis.oblasts);
  set(LAYER_COUNTRY_FILL, true);
  set(LAYER_COUNTRY_LINE, true);
  set(LAYER_COUNTRY_CONTEXT_FILL, true);
  set(LAYER_COUNTRY_CONTEXT_LINE, true);
  set(LAYER_CITY_HALO, vis.cities);
  set(LAYER_CITY_DOT, vis.cities);
  set(LAYER_CITY_LABEL, vis.cities);
  set(LAYER_FRONTLINE_BUFFER, vis.frontline);
  set(LAYER_FRONTLINE_LINE, vis.frontline);
  set(LAYER_SUPPLY_LINE, vis.supply_lines);
  set(LAYER_SUPPLY_DASH, vis.supply_lines);

  // Asset visibility is per-kind, driven by individual toggles.
  const assetKindVisible = (kind: string): boolean => {
    if (kind === "depot") return vis.depots;
    if (kind === "airfield") return vis.airfields;
    if (kind === "naval_base") return vis.naval_bases;
    if (kind === "border_crossing") return vis.border_crossings;
    return false;
  };
  const anyAsset =
    vis.depots || vis.airfields || vis.naval_bases || vis.border_crossings;
  set(LAYER_ASSET_DOT, anyAsset);
  set(LAYER_ASSET_LABEL, anyAsset);
  // Empty `in` + `["literal", []]` breaks MapLibre symbol draw (null `.width`); skip setFilter when nothing is on.
  if (anyAsset) {
    const kinds = (["depot", "airfield", "naval_base", "border_crossing"] as const).filter(
      assetKindVisible,
    );
    const assetFilter: maplibregl.FilterSpecification = [
      "in",
      ["get", "kind"],
      ["literal", kinds],
    ] as maplibregl.FilterSpecification;
    if (map.getLayer(LAYER_ASSET_DOT)) map.setFilter(LAYER_ASSET_DOT, assetFilter);
    if (map.getLayer(LAYER_ASSET_LABEL)) map.setFilter(LAYER_ASSET_LABEL, assetFilter);
  }

  if (map.getLayer(LAYER_UNIT_DOT)) {
    const allowed: string[] = [];
    if (vis.units_ground) allowed.push("ground");
    if (vis.units_air) allowed.push("air");
    if (vis.units_naval) allowed.push("naval");
    const showUnits = allowed.length > 0;
    set(LAYER_UNIT_DOT, showUnits);
    set(LAYER_UNIT_HALO, showUnits);
    set(LAYER_UNIT_GLYPH, showUnits);
    if (showUnits) {
      const filter: maplibregl.FilterSpecification = [
        "in",
        ["get", "domain"],
        ["literal", allowed],
      ] as maplibregl.FilterSpecification;
      map.setFilter(LAYER_UNIT_DOT, filter);
      map.setFilter(LAYER_UNIT_HALO, filter);
      if (map.getLayer(LAYER_UNIT_GLYPH)) map.setFilter(LAYER_UNIT_GLYPH, filter);
    }
  }
}
