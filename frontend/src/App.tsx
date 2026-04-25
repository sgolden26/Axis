import { useEffect } from "react";
import { useAppStore } from "@/state/store";
import { loadScenario } from "@/api/loadScenario";
import { HUD } from "@/ui/HUD";
import { CommandRail } from "@/ui/CommandRail";
import { Sidebar } from "@/ui/Sidebar/Sidebar";
import { MapView } from "@/map/MapView";

export function App() {
  const setScenario = useAppStore((s) => s.setScenario);
  const setLoadError = useAppStore((s) => s.setLoadError);
  const loadError = useAppStore((s) => s.loadError);
  const scenario = useAppStore((s) => s.scenario);

  useEffect(() => {
    loadScenario()
      .then(setScenario)
      .catch((err: Error) => setLoadError(err.message));
  }, [setScenario, setLoadError]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-900 text-ink-50">
      <HUD />
      <div className="relative flex flex-1 overflow-hidden">
        <CommandRail />
        <main className="relative flex-1 overflow-hidden">
          <MapView />
          {!scenario && !loadError && <LoadingOverlay />}
          {loadError && <ErrorOverlay message={loadError} />}
        </main>
        <Sidebar />
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
