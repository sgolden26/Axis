import { useEffect } from "react";
import { useAppStore } from "@/state/store";
import { loadScenario } from "@/api/loadScenario";
import { loadIntel } from "@/api/loadIntel";
import { HUD } from "@/ui/HUD";
import { CommandRail } from "@/ui/CommandRail";
import { Sidebar } from "@/ui/Sidebar/Sidebar";
import { MapView } from "@/map/MapView";
import { DecisionEngine } from "@/ui/DecisionEngine/DecisionEngine";
import { CountryRoster } from "@/ui/CountryRoster";
import { ChoroplethLegend } from "@/ui/ChoroplethLegend";

export function App() {
  const setScenario = useAppStore((s) => s.setScenario);
  const setLoadError = useAppStore((s) => s.setLoadError);
  const setIntel = useAppStore((s) => s.setIntel);
  const setIntelError = useAppStore((s) => s.setIntelError);
  const intelTickIntervalMs = useAppStore((s) => s.intelTickIntervalMs);
  const loadError = useAppStore((s) => s.loadError);
  const scenario = useAppStore((s) => s.scenario);

  useEffect(() => {
    loadScenario()
      .then(setScenario)
      .catch((err: Error) => setLoadError(err.message));
  }, [setScenario, setLoadError]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const snap = await loadIntel();
        if (!cancelled) setIntel(snap);
      } catch (err) {
        if (!cancelled) {
          setIntelError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void tick();
    const id = window.setInterval(tick, intelTickIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [setIntel, setIntelError, intelTickIntervalMs]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-900 text-ink-50">
      <HUD />
      <div className="relative flex flex-1 overflow-hidden">
        <CommandRail />
        <main className="relative flex-1 overflow-hidden">
          <MapView />
          <ChoroplethLegend />
          <CountryRoster />
          {!scenario && !loadError && <LoadingOverlay />}
          {loadError && <ErrorOverlay message={loadError} />}
        </main>
        <Sidebar />
        <DecisionEngine />
      </div>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="hairline border bg-ink-800/80 px-4 py-2 font-mono text-[10px] uppercase tracking-wider2 text-ink-100">
        loading theatre...
      </div>
    </div>
  );
}

function ErrorOverlay({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="hairline max-w-md border bg-ink-800/90 px-4 py-3 font-mono text-[11px] uppercase tracking-wider2 text-accent-danger">
        <div className="mb-1">scenario load failed</div>
        <div className="text-ink-100 normal-case">{message}</div>
        <div className="mt-2 text-ink-200 normal-case">
          run the backend exporter:
          <br />
          <span className="text-ink-50">
            cd backend &amp;&amp; python -m axis export --out ../data/state.json
          </span>
        </div>
      </div>
    </div>
  );
}
