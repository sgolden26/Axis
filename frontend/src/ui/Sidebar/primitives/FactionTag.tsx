import type { Faction } from "@/types/scenario";

interface Props {
  faction: Faction;
}

export function FactionTag({ faction }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider2"
      style={{ borderColor: faction.color, color: faction.color }}
    >
      <span
        className="inline-block h-1.5 w-1.5"
        style={{ background: faction.color }}
      />
      {faction.name}
    </span>
  );
}
