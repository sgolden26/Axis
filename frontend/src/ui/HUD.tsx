import { useAppStore } from "@/state/store";

export function HUD() {
  const scenario = useAppStore((s) => s.scenario);

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

      <div className="hairline-l flex flex-1 items-center justify-center gap-6 px-6 font-mono text-[10px] uppercase tracking-wider2 text-ink-100">
        <span className="text-accent-amber">
          {scenario?.scenario.classification ?? "UNCLASSIFIED // EXERCISE"}
        </span>
        <span className="text-ink-300">|</span>
        <span>scenario · {scenario?.scenario.name ?? "—"}</span>
        <span className="text-ink-300">|</span>
        <span>clock · {scenario?.scenario.clock.replace("T", " ").slice(0, 16) ?? "—"}</span>
      </div>

      <div className="hairline-l flex items-center gap-4 px-4 font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
        <span>v0.1.0</span>
        <span className="text-ink-300">·</span>
        <span className="text-accent-ok">live</span>
      </div>
    </header>
  );
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
