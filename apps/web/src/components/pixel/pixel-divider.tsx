/**
 * Box-drawing section divider with an optional centered label, e.g.
 * ──────[ TRENDING ]──────. Pure markup.
 */
export function PixelDivider({ label }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em]"
      style={{ color: 'hsl(var(--tl-muted))' }}
      aria-hidden
    >
      <span className="h-[2px] flex-1" style={{ background: 'hsl(var(--tl-ink))' }} />
      {label ? (
        <span className="tl-box-flat px-3 py-1 leading-none">{label}</span>
      ) : (
        <span>◆</span>
      )}
      <span className="h-[2px] flex-1" style={{ background: 'hsl(var(--tl-ink))' }} />
    </div>
  )
}
