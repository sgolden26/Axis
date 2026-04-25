import { useAppStore } from "@/state/store";
import type { Country } from "@/types/country";

interface Props {
  countryId: string | null | undefined;
}

/** Small clickable chip that selects the country dossier when known. */
export function CountryBadge({ countryId }: Props) {
  const country = useAppStore((s) =>
    countryId
      ? (s.scenario?.countries.find((c) => c.id === countryId) as Country | undefined)
      : undefined,
  );
  const select = useAppStore((s) => s.select);

  if (!countryId) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-300">
        no country
      </span>
    );
  }

  if (!country) {
    return (
      <span
        className="hairline border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider2 text-ink-300"
        title="dossier not seeded"
      >
        {countryId}
      </span>
    );
  }

  return (
    <button
      onClick={() => select({ kind: "country", id: country.id })}
      className="hairline inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider2 text-ink-50 hover:bg-ink-700"
      title={`Open ${country.name} dossier`}
    >
      <span className="text-[12px] leading-none">{country.flag_emoji}</span>
      {country.name}
      <span className="text-ink-300">→</span>
    </button>
  );
}
