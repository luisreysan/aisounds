import { PixelHeader } from '@/components/pixel/pixel-header'

export function PixelShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PixelHeader />
      {children}
      <footer className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6">
        <div className="tl-box-flat flex flex-col items-center gap-2 px-4 py-5 text-center text-[11px] uppercase tracking-widest">
          <span aria-hidden className="tl-rgb text-base font-black">
            ◄◄ ■ ►►
          </span>
          <span style={{ color: 'hsl(var(--tl-muted))' }}>
            aisounds.dev — sound packs for AI coding tools
          </span>
        </div>
      </footer>
    </>
  )
}
