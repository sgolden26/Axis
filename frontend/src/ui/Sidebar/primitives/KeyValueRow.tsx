interface Props {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export function KeyValueRow({ label, value, mono = true }: Props) {
  return (
    <div className="flex items-baseline justify-between px-4 py-1.5 text-xs">
      <span className="text-ink-200 uppercase tracking-wider2 text-[10px] font-mono">
        {label}
      </span>
      <span className={`text-ink-50 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
