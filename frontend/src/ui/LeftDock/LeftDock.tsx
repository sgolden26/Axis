import { useAppStore } from "@/state/store";
import { FilterChips } from "./FilterChips";
import { OOBTree } from "./OOBTree";

export function LeftDock() {
  const open = useAppStore((s) => s.leftDockOpen);
  const setOpen = useAppStore((s) => s.setLeftDockOpen);

  if (!open) {
    return (
      <div className="hairline-r flex h-full w-7 shrink-0 items-start justify-center bg-ink-800 pt-2">
        <button
          onClick={() => setOpen(true)}
          className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200 hover:text-ink-50"
          title="Open left dock ( [ )"
        >
          ›
        </button>
      </div>
    );
  }

  return (
    <aside className="hairline-r flex h-full w-[280px] shrink-0 flex-col bg-ink-800">
      <div className="hairline-b flex items-center justify-between px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
          theatre
        </span>
        <button
          onClick={() => setOpen(false)}
          className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200 hover:text-ink-50"
          title="Collapse ( [ )"
        >
          ‹
        </button>
      </div>

      <div className="hairline-b">
        <FilterChips />
      </div>

      <div className="flex-1 overflow-y-auto">
        <OOBTree />
      </div>
    </aside>
  );
}
