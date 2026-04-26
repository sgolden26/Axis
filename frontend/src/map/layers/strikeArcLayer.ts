import type { GeoJSONSource, LayerSpecification, Map as MlMap } from "maplibre-gl";
import { greatCircleInterpolate, greatCircleLineString } from "@/map/geodesic";
import type { ReplayEngageEvent, ReplayStrikeEvent } from "@/state/replay";
import { LAYER_UNIT_DOT } from "@/map/style";

export const SOURCE_STRIKE_ARC = "replay_strike_arc";
export const LAYER_STRIKE_ARC_LINE = "replay_strike_arc_line";
export const LAYER_STRIKE_ARC_TRACER = "replay_strike_arc_tracer";
export const LAYER_STRIKE_ARC_PULSE = "replay_strike_arc_pulse";

const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Mount strike-arc layers (line, tracer dot, impact pulse) on the map.
 *  Layers are inserted under the unit dot layer so units stay clickable. */
export function ensureStrikeArcLayer(map: MlMap): void {
  if (!map.getSource(SOURCE_STRIKE_ARC)) {
    map.addSource(SOURCE_STRIKE_ARC, { type: "geojson", data: empty });
  }
  const specs: LayerSpecification[] = [
    {
      id: LAYER_STRIKE_ARC_LINE,
      type: "line",
      source: SOURCE_STRIKE_ARC,
      filter: ["==", ["get", "layer"], "arc"],
      paint: {
        "line-color": ["get", "color"],
        "line-width": 1.2,
        "line-opacity": ["get", "opacity"],
      },
      layout: { "line-cap": "round" },
    },
    {
      id: LAYER_STRIKE_ARC_TRACER,
      type: "circle",
      source: SOURCE_STRIKE_ARC,
      filter: ["==", ["get", "layer"], "tracer"],
      paint: {
        "circle-radius": 3,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.95,
        "circle-stroke-color": "#0b0f14",
        "circle-stroke-width": 0.8,
      },
    },
    {
      id: LAYER_STRIKE_ARC_PULSE,
      type: "circle",
      source: SOURCE_STRIKE_ARC,
      filter: ["==", ["get", "layer"], "pulse"],
      paint: {
        "circle-radius": ["get", "radius"],
        "circle-color": ["get", "color"],
        "circle-opacity": ["get", "opacity"],
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-width": 1.5,
        "circle-stroke-opacity": ["get", "opacity"],
      },
    },
  ];
  for (const s of specs) {
    if (!map.getLayer(s.id)) {
      if (map.getLayer(LAYER_UNIT_DOT)) map.addLayer(s, LAYER_UNIT_DOT);
      else map.addLayer(s);
    }
  }
}

interface ArcShape {
  origin: [number, number];
  target: [number, number];
  color: string;
  /** Damage flavour: "hit" | "miss" | "intercept" — affects pulse colour. */
  flavour: "hit" | "miss" | "intercept";
}

export function arcsFromReplayEvents(
  events: readonly (ReplayStrikeEvent | ReplayEngageEvent)[],
): ArcShape[] {
  const out: ArcShape[] = [];
  for (const e of events) {
    if (e.kind === "strike") {
      const flavour: ArcShape["flavour"] = e.intercepted
        ? "intercept"
        : e.hit ? "hit" : "miss";
      out.push({
        origin: e.origin, target: e.target,
        color: teamColor(e.team), flavour,
      });
    } else if (e.kind === "engage") {
      out.push({
        origin: e.origin, target: e.target,
        color: teamColor(e.team),
        flavour: e.defenderRetreated || e.defenderStrengthLoss > 0.05 ? "hit" : "miss",
      });
    }
  }
  return out;
}

function teamColor(team: "red" | "blue"): string {
  return team === "blue" ? "#5aa9ff" : "#ff5a5a";
}

function pulseColor(flavour: ArcShape["flavour"], baseColor: string): string {
  if (flavour === "intercept") return "#ffd166";
  if (flavour === "miss") return "#9aa3ad";
  return baseColor;
}

/** Drive the arc + tracer + pulse animation. Returns a stop fn. The tween
 *  walks `t` from 0 to 1 over `durationMs`. After `t` reaches the strike
 *  threshold, an impact pulse expands at the target until the end of the
 *  animation. After completion, the source is left empty so the layer is
 *  invisible until the next call. */
export function playStrikeAnimation(
  map: MlMap,
  arcs: ArcShape[],
  durationMs: number,
): () => void {
  const src = map.getSource(SOURCE_STRIKE_ARC) as GeoJSONSource | undefined;
  if (!src || arcs.length === 0) return () => {};

  // Pre-compute arc geometries.
  const lines = arcs.map((a) => greatCircleLineString(a.origin, a.target));

  const start = performance.now();
  let stopped = false;
  const STRIKE_AT = 0.78; // tracer arrives at target around ~78% of duration.
  const PULSE_DURATION = 0.20;

  function frame() {
    if (stopped) return;
    const t = Math.min(1, (performance.now() - start) / durationMs);
    const features: GeoJSON.Feature[] = [];

    arcs.forEach((arc, i) => {
      const traceT = Math.min(1, t / STRIKE_AT);
      const arcOpacity = 0.85;
      features.push({
        type: "Feature",
        properties: { layer: "arc", color: arc.color, opacity: arcOpacity },
        geometry: lines[i] ?? greatCircleLineString(arc.origin, arc.target),
      });
      if (traceT < 1) {
        const pos = greatCircleInterpolate(arc.origin, arc.target, traceT);
        features.push({
          type: "Feature",
          properties: { layer: "tracer", color: arc.color },
          geometry: { type: "Point", coordinates: pos },
        });
      }
      if (t >= STRIKE_AT) {
        const pT = Math.min(1, (t - STRIKE_AT) / PULSE_DURATION);
        const radius = 6 + 22 * pT;
        const opacity = 0.7 * (1 - pT);
        features.push({
          type: "Feature",
          properties: {
            layer: "pulse",
            color: pulseColor(arc.flavour, arc.color),
            radius, opacity,
          },
          geometry: { type: "Point", coordinates: arc.target },
        });
      }
    });

    src!.setData({ type: "FeatureCollection", features });

    if (t < 1) requestAnimationFrame(frame);
    else src!.setData(empty);
  }
  requestAnimationFrame(frame);
  return () => { stopped = true; src.setData(empty); };
}

export function clearStrikeArcs(map: MlMap): void {
  const src = map.getSource(SOURCE_STRIKE_ARC) as GeoJSONSource | undefined;
  if (src) src.setData(empty);
}
