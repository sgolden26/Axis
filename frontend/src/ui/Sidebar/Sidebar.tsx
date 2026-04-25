import { useAppStore } from "@/state/store";
import { EmptyState } from "./EmptyState";
import { CityDetail } from "./CityDetail";
import { UnitDetail } from "./UnitDetail";
import { TerritoryDetail } from "./TerritoryDetail";
import { CountryDetail } from "./CountryDetail";

export function Sidebar() {
  const scenario = useAppStore((s) => s.scenario);
  const selection = useAppStore((s) => s.selection);
  const clearSelection = useAppStore((s) => s.clearSelection);

  if (!scenario) {
    return (
      <aside className="hairline-l hidden h-full w-[340px] shrink-0 flex-col bg-ink-800 xl:flex">
        <EmptyState />
      </aside>
    );
  }

  const factionsById = new Map(scenario.factions.map((f) => [f.id, f]));

  let body: React.ReactNode = <EmptyState />;
  let title = "no contact";

  if (selection?.kind === "city") {
    const city = scenario.cities.find((c) => c.id === selection.id);
    const faction = city ? factionsById.get(city.faction_id) : undefined;
    if (city && faction) {
      body = <CityDetail city={city} faction={faction} />;
      title = city.name.toUpperCase();
    }
  } else if (selection?.kind === "unit") {
    const unit = scenario.units.find((u) => u.id === selection.id);
    const faction = unit ? factionsById.get(unit.faction_id) : undefined;
    if (unit && faction) {
      body = <UnitDetail unit={unit} faction={faction} />;
      title = (unit.callsign || unit.name).toUpperCase();
    }
  } else if (selection?.kind === "territory") {
    const territory = scenario.territories.find((t) => t.id === selection.id);
    const faction = territory ? factionsById.get(territory.faction_id) : undefined;
    if (territory && faction) {
      body = <TerritoryDetail territory={territory} faction={faction} />;
      title = territory.name.toUpperCase();
    }
  } else if (selection?.kind === "country") {
    const country = scenario.countries.find((c) => c.id === selection.id);
    const faction = country ? factionsById.get(country.faction_id) : undefined;
    if (country && faction) {
      body = <CountryDetail country={country} faction={faction} />;
      title = country.name.toUpperCase();
    }
  }

  return (
    <aside className="hairline-l hidden h-full w-[340px] shrink-0 flex-col bg-ink-800 xl:flex">
      <div className="hairline-b flex items-center justify-between px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
          contact // {title}
        </span>
        {selection && (
          <button
            onClick={clearSelection}
            className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200 hover:text-ink-50"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">{body}</div>
    </aside>
  );
}
