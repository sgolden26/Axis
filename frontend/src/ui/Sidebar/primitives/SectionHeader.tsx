interface Props {
  label: string;
  trailing?: React.ReactNode;
}

export function SectionHeader({ label, trailing }: Props) {
  return (
    <div className="hairline-b flex items-center justify-between px-4 py-2">
      <span className="font-mono text-[10px] uppercase tracking-wider2 text-ink-200">
        {label}
      </span>
      {trailing ? <span className="font-mono text-[10px] text-ink-200">{trailing}</span> : null}
    </div>
  );
}
