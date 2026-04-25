import { useEffect, useRef } from "react";
import maplibregl, { Map as MlMap, MapGeoJSONFeature } from "maplibre-gl";
import { useAppStore, type LayerKey } from "@/state/store";
import type { ScenarioSnapshot, Selection } from "@/types/scenario";
import {
  baseStyle,
  LAYER_CITY_DOT,
  LAYER_CITY_HALO,
  LAYER_CITY_LABEL,
  LAYER_TERRITORY_FILL,
  LAYER_TERRITORY_LINE,
  LAYER_UNIT_DOT,
  LAYER_UNIT_HALO,
  SOURCE_CITIES,
  SOURCE_TERRITORIES,
  SOURCE_UNITS,
} from "./style";
import {
  territoryFeatureCollection,
  territoryFillLayer,
  territoryLineLayer,
} from "./layers/territoryLayer";
import {
  cityDotLayer,
  cityFeatureCollection,
  cityHaloLayer,
  cityLabelLayer,
} from "./layers/cityLayer";
import {
  unitDotLayer,
  unitFeatureCollection,
  unitHaloLayer,
} from "./layers/unitLayer";

const CLICKABLE_LAYERS = [
  LAYER_UNIT_DOT,
  LAYER_UNIT_HALO,
  LAYER_CITY_DOT,
  LAYER_CITY_HALO,
  LAYER_TERRITORY_FILL,
];

type HoverState = { source: string; id: string | number } | null;

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const hoverRef = useRef<HoverState>(null);
  const selectionRef = useRef<Selection>(null);

  const scenario = useAppStore((s) => s.scenario);
  const selection = useAppStore((s) => s.selection);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const select = useAppStore((s) => s.select);

  // initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseStyle,
      center: [22.5, 54.4],
      zoom: 5.6,
      attributionControl: { compact: true },
      hash: false,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "bottom-right",
    );
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // load scenario data into map sources/layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario) return;
    const apply = () => addOrUpdateData(map, scenario);
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [scenario]);

  // wire interactions once data is on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario) return;

    const onClick = (
      ev: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] },
    ) => {
      const feat = ev.features?.[0];
      if (!feat) return;
      const id = feat.properties?.id as string | undefined;
      if (!id) return;
      if (feat.source === SOURCE_UNITS) select({ kind: "unit", id });
      else if (feat.source === SOURCE_CITIES) select({ kind: "city", id });
      else if (feat.source === SOURCE_TERRITORIES) select({ kind: "territory", id });
    };

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      if (hoverRef.current) {
        map.setFeatureState(hoverRef.current, { hover: false });
        hoverRef.current = null;
      }
    };
    const onMouseMove = (
      ev: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] },
    ) => {
      const feat = ev.features?.[0];
      if (!feat || feat.id == null) return;
      const next: HoverState = { source: feat.source, id: feat.id };
      if (
        hoverRef.current &&
        (hoverRef.current.source !== next.source || hoverRef.current.id !== next.id)
      ) {
        map.setFeatureState(hoverRef.current, { hover: false });
      }
      map.setFeatureState(next, { hover: true });
      hoverRef.current = next;
    };

    const onMapClickEmpty = (ev: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(ev.point, {
        layers: CLICKABLE_LAYERS,
      });
      if (features.length === 0) {
        useAppStore.getState().clearSelection();
      }
    };

    for (const layer of CLICKABLE_LAYERS) {
      map.on("click", layer, onClick);
      map.on("mouseenter", layer, onMouseEnter);
      map.on("mouseleave", layer, onMouseLeave);
      map.on("mousemove", layer, onMouseMove);
    }
    map.on("click", onMapClickEmpty);

    return () => {
      for (const layer of CLICKABLE_LAYERS) {
        map.off("click", layer, onClick);
        map.off("mouseenter", layer, onMouseEnter);
        map.off("mouseleave", layer, onMouseLeave);
        map.off("mousemove", layer, onMouseMove);
      }
      map.off("click", onMapClickEmpty);
    };
  }, [scenario, select]);

  // reflect selection into feature-state
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario) return;

    const prev = selectionRef.current;
    if (prev) {
      const src = sourceForKind(prev.kind);
      map.setFeatureState({ source: src, id: prev.id }, { selected: false });
    }
    if (selection) {
      const src = sourceForKind(selection.kind);
      map.setFeatureState({ source: src, id: selection.id }, { selected: true });
    }
    selectionRef.current = selection;
  }, [selection, scenario]);

  // toggle layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scenario) return;
    const apply = () => applyLayerVisibility(map, visibleLayers);
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [visibleLayers, scenario]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function sourceForKind(kind: NonNullable<Selection>["kind"]): string {
  switch (kind) {
    case "city":
      return SOURCE_CITIES;
    case "unit":
      return SOURCE_UNITS;
    case "territory":
      return SOURCE_TERRITORIES;
  }
}

function addOrUpdateData(map: MlMap, scenario: ScenarioSnapshot) {
  const factionsById = new Map(scenario.factions.map((f) => [f.id, f]));
  const territories = territoryFeatureCollection(scenario.territories, factionsById);
  const cities = cityFeatureCollection(scenario.cities, factionsById);
  const units = unitFeatureCollection(scenario.units, factionsById);

  upsertGeoJsonSource(map, SOURCE_TERRITORIES, withStringIds(territories));
  upsertGeoJsonSource(map, SOURCE_CITIES, withStringIds(cities));
  upsertGeoJsonSource(map, SOURCE_UNITS, withStringIds(units));

  if (!map.getLayer(territoryFillLayer.id)) map.addLayer(territoryFillLayer);
  if (!map.getLayer(territoryLineLayer.id)) map.addLayer(territoryLineLayer);
  if (!map.getLayer(cityHaloLayer.id)) map.addLayer(cityHaloLayer);
  if (!map.getLayer(cityDotLayer.id)) map.addLayer(cityDotLayer);
  if (!map.getLayer(cityLabelLayer.id)) map.addLayer(cityLabelLayer);
  if (!map.getLayer(unitHaloLayer.id)) map.addLayer(unitHaloLayer);
  if (!map.getLayer(unitDotLayer.id)) map.addLayer(unitDotLayer);
}

function upsertGeoJsonSource(
  map: MlMap,
  id: string,
  data: GeoJSON.FeatureCollection,
) {
  const existing = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }
  map.addSource(id, { type: "geojson", data, promoteId: "id" });
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
  set(LAYER_TERRITORY_FILL, vis.territory);
  set(LAYER_TERRITORY_LINE, vis.territory);
  set(LAYER_CITY_HALO, vis.cities);
  set(LAYER_CITY_DOT, vis.cities);
  set(LAYER_CITY_LABEL, vis.cities);

  // Units are filtered by domain via the toggles. We use a shared filter on
  // both unit layers; rebuilding it on toggle keeps things simple.
  const allowed: string[] = [];
  if (vis.units_ground) allowed.push("ground");
  if (vis.units_air) allowed.push("air");
  if (vis.units_naval) allowed.push("naval");
  const filter: maplibregl.FilterSpecification | null =
    allowed.length === 0
      ? ["==", ["get", "domain"], "__none__"]
      : ["in", ["get", "domain"], ["literal", allowed]];
  if (map.getLayer(LAYER_UNIT_DOT)) map.setFilter(LAYER_UNIT_DOT, filter);
  if (map.getLayer(LAYER_UNIT_HALO)) map.setFilter(LAYER_UNIT_HALO, filter);
}
