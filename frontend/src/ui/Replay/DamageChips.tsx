import { useEffect, useState } from "react";
import { useAppStore } from "@/state/store";
import { subscribeMap } from "@/map/mapRef";
import type {
  ReplayEngageEvent,
  ReplayStrikeEvent,
} from "@/state/replay";

type ChipEvent = ReplayEngageEvent | ReplayStrikeEvent;

/** Persistent damage report chips anchored to map lon/lat. They render once
 *  the replay enters the "reports" phase (and stay through "strikes" too, so
 *  the impact pulse and the chip co-occur). Hidden in any other state. */
export function DamageChips() {
  const replay = useAppStore((s) => s.replay);
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeMap((m) => {
      if (!m) return;
      const bump = () => setTick((t) => t + 1);
      m.on("move", bump);
      m.on("zoom", bump);
      m.on("rotate", bump);
      m.on("pitch", bump);
      m.on("resize", bump);
      bump();
      return () => {
        m.off("move", bump); m.off("zoom", bump);
        m.off("rotate", bump); m.off("pitch", bump);
        m.off("resize", bump);
      };
    });
  }, []);

  if (!replay) return null;
  if (replay.phase !== "strikes" && replay.phase !== "reports") return null;

  const events = replay.events.filter(
    (e): e is ChipEvent => e.kind === "strike" || e.kind === "engage",
  );
  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {events.map((e) => (
        <Chip key={e.orderId} event={e} />
      ))}
    </div>
  );
}

function Chip({ event }: { event: ChipEvent }) {
  const replay = useAppStore((s) => s.replay);
  const phase = replay?.phase;
  const [pos, setPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    return subscribeMap((m) => {
      if (!m) {
        setPos(null);
        return;
      }
      const update = () => {
        const p = m.project(event.target);
        setPos([p.x, p.y]);
      };
      update();
      m.on("move", update);
      m.on("zoom", update);
      m.on("rotate", update);
      m.on("pitch", update);
      m.on("resize", update);
      return () => {
        m.off("move", update); m.off("zoom", update);
        m.off("rotate", update); m.off("pitch", update);
        m.off("resize", update);
      };
    });
  }, [event.target]);

  if (!pos) return null;

  const muted = phase === "strikes";
  const colour = event.team === "blue" ? "#5aa9ff" : "#ff5a5a";
  const lines = chipLines(event);
  const headline = chipHeadline(event);

  return (
    <div
      style={{
        position: "absolute",
        left: pos[0],
        top: pos[1],
        transform: "translate(8px, -50%)",
        opacity: muted ? 0.55 : 1,
        transition: "opacity 220ms ease-out",
      }}
      className="rounded-sm border bg-slate-950/90 px-2 py-1 font-mono text-[10.5px] shadow-md"
      data-team={event.team}
    >
      <div
        style={{ color: colour }}
        className="flex items-center gap-1 uppercase tracking-wider"
      >
        <span
          aria-hidden
          style={{ background: colour }}
          className="h-1.5 w-1.5 rounded-full"
        />
        <span>{headline}</span>
      </div>
      {lines.map((l, i) => (
        <div key={i} className="text-slate-300 leading-snug">{l}</div>
      ))}
    </div>
  );
}

function chipHeadline(e: ChipEvent): string {
  if (e.kind === "engage") {
    if (e.defenderRetreated) return "Engagement · retreat";
    return "Engagement";
  }
  if (e.intercepted) return `${prettyVariety(e.variety)} · intercept`;
  if (!e.hit) return `${prettyVariety(e.variety)} · miss`;
  return `${prettyVariety(e.variety)} · hit`;
}

function prettyVariety(v: string): string {
  switch (v) {
    case "air_strike": return "Air strike";
    case "air_sead": return "SEAD";
    case "naval_strike": return "Naval strike";
    case "missile": return "Missile";
    case "interdict": return "Interdict";
    default: return v;
  }
}

function chipLines(e: ChipEvent): string[] {
  if (e.kind === "engage") {
    return [
      `def Δstr ${pct(e.defenderStrengthLoss)}  mor ${pct(e.defenderMoraleLoss)}`,
      `atk Δstr ${pct(e.attackerStrengthLoss)}  mor ${pct(e.attackerMoraleLoss)}`,
      e.defenderName,
    ];
  }
  const lines: string[] = [];
  if (e.intercepted) {
    lines.push("intercepted before impact");
  } else if (!e.hit) {
    lines.push("missed target");
  } else {
    lines.push(`damage ${pct(e.damage)}`);
  }
  if (e.attackerLoss > 0) lines.push(`atk Δstr ${pct(e.attackerLoss)}`);
  lines.push(e.targetLabel);
  return lines;
}

function pct(v: number): string {
  return `-${Math.max(0, Math.round(v * 100))}%`;
}
