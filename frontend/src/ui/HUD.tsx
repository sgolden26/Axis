import { useEffect, useState } from "react";
import { useAppStore } from "@/state/store";

export function HUD() {
  const scenario = useAppStore((s) => s.scenario);
  const intel = useAppStore((s) => s.intel);
  const lastIntelLoadAt = useAppStore((s) => s.lastIntelLoadAt);
  const intelError = useAppStore((s) => s.intelError);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ago = lastIntelLoadAt
    ? Math.max(0, Math.round((now - lastIntelLoadAt) / 1000))
    : null;

  return (
    <header className="hairline-b relative flex h-12 shrink-0 items-stretch bg-ink-800">
      <div className="flex items-center gap-3 px-4">
        <Logo />
        <div className="flex flex-col leading-none">
          <span className="font-semibold tracking-wide text-ink-50">AXIS</span>
          <span className="font-mono text-[9px] uppercase tracking-wider2 text-ink-200">
            theatre console
          </span>
        </div>
      </div>

      <div className="hairline-l flex min-w-0 flex-1 items-stretch">
        <div className="hairline-r flex shrink-0 items-center px-3">
          <TeamBar />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-6 px-6 font-mono text-[10px] uppercase tracking-wider2 text-ink-100">
          <span className="text-accent-amber">
            {scenario?.scenario.classification ?? "UNCLASSIFIED // EXERCISE"}
          </span>
          <span className="text-ink-300">|</span>
          <span>scenario · {scenario?.scenario.name ?? "—"}</span>
          <span className="text-ink-300">|</span>
          <span>clock · {scenario?.scenario.clock.replace("T", " ").slice(0, 16) ?? "—"}</span>
        </div>
      </div>

      <div className="hairline-l flex items-center gap-4 px-4 font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
        <CountriesButton />
        <span className="text-ink-300">·</span>
        <IntelTickBadge
          source={intel?.source ?? null}
          tickSeq={intel?.tick_seq ?? null}
          ago={ago}
          error={intelError}
        />
        <span className="text-ink-300">·</span>
        <span>v{__schemaSummary(scenario?.schema_version, intel?.intel_schema_version)}</span>
      </div>
    </header>
  );
}

function TeamBar() {
  const team = useAppStore((s) => s.playerTeam);
  const setTeam = useAppStore((s) => s.setPlayerTeam);
  return (
    <div
      role="radiogroup"
      aria-label="Player team"
      className="inline-flex h-7 items-stretch hairline"
    >
      <TeamBarOption
        label="blue team"
        selected={team === "blue"}
        onSelect={() => setTeam("blue")}
        className="border-r border-ink-500/40"
        activeClassName="text-faction-nato bg-ink-700/90"
        idleClassName="text-ink-200 hover:text-faction-nato/90"
        title="Play as blue-side (NATO / allied) forces"
      />
      <TeamBarOption
        label="red team"
        selected={team === "red"}
        onSelect={() => setTeam("red")}
        activeClassName="text-faction-ru bg-ink-700/90"
        idleClassName="text-ink-200 hover:text-faction-ru/90"
        title="Play as red-side forces"
      />
    </div>
  );
}

function TeamBarOption({
  label,
  selected,
  onSelect,
  className: wrapClass = "",
  activeClassName,
  idleClassName,
  title: tip,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  activeClassName: string;
  idleClassName: string;
  title: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      title={tip}
      onClick={onSelect}
      className={`min-w-[5.5rem] px-2.5 font-mono text-[9px] uppercase tracking-wider2 transition-colors ${
        selected ? activeClassName : idleClassName
      } ${wrapClass}`}
    >
      {label}
    </button>
  );
}

function CountriesButton() {
  const open = useAppStore((s) => s.rosterOpen);
  const setOpen = useAppStore((s) => s.setRosterOpen);
  const count = useAppStore((s) => s.scenario?.countries.length ?? 0);
  if (count === 0) return null;
  return (
    <button
      onClick={() => setOpen(!open)}
      aria-pressed={open}
      className={`hairline border px-2 py-1 font-mono text-[10px] uppercase tracking-wider2 transition-colors ${
        open
          ? "border-accent-amber text-accent-amber"
          : "border-ink-500 text-ink-100 hover:text-ink-50"
      }`}
    >
      countries · {count}
    </button>
  );
}

function IntelTickBadge({
  source,
  tickSeq,
  ago,
  error,
}: {
  source: string | null;
  tickSeq: number | null;
  ago: number | null;
  error: string | null;
}) {
  if (error) {
    return <span className="text-accent-danger">intel · offline</span>;
  }
  if (ago == null) {
    return <span className="text-ink-200">intel · warming up</span>;
  }
  const tone = ago > 10 ? "text-accent-amber" : "text-accent-ok";
  return (
    <span className={tone}>
      intel · {source ?? "?"}
      {tickSeq != null && tickSeq > 0 ? ` #${tickSeq}` : ""} · {ago}s
    </span>
  );
}

function __schemaSummary(state: string | undefined, intel: string | undefined): string {
  return `${state ?? "?"}/${intel ?? "?"}`;
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" className="text-faction-nato">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18" />
        <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" opacity="0.45" />
      </g>
    </svg>
  );
}
