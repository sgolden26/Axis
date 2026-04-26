import { useAppStore, type RightTab } from "@/state/store";
import { Sidebar } from "@/ui/Sidebar/Sidebar";
import { DecisionEngine } from "@/ui/DecisionEngine/DecisionEngine";
import { PromptPanel } from "@/ui/Prompt/PromptPanel";

const TABS: { id: RightTab; label: string }[] = [
  { id: "prompt", label: "prompt" },
  { id: "context", label: "context" },
  { id: "decision", label: "decision" },
];

export function RightPanel() {
  const tab = useAppStore((s) => s.rightTab);
  const setTab = useAppStore((s) => s.setRightTab);
  const open = useAppStore((s) => s.rightPanelOpen);
  const setOpen = useAppStore((s) => s.setRightPanelOpen);

  if (!open) {
    return (
      <div className="hairline-l flex h-full w-7 shrink-0 items-start justify-center bg-ink-800 pt-2">
        <button
          onClick={() => setOpen(true)}
          className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200 hover:text-ink-50"
          title="Open right panel ( ] )"
        >
          ‹
        </button>
      </div>
    );
  }

  return (
    <aside className="hairline-l flex h-full w-[400px] shrink-0 flex-col bg-ink-800">
      <div className="hairline-b flex items-center bg-ink-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-wider2 transition-colors ${
              tab === t.id
                ? "bg-ink-700 text-ink-50"
                : "text-ink-200 hover:text-ink-50"
            }`}
            aria-pressed={tab === t.id}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider2 text-ink-200 hover:text-ink-50"
          title="Collapse ( ] )"
        >
          ›
        </button>
      </div>
      <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "prompt" ? (
          <PromptPanel />
        ) : tab === "context" ? (
          <Sidebar />
        ) : (
          <DecisionEngine />
        )}
      </div>
    </aside>
  );
}
