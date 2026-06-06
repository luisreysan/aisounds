import { PixelDivider } from '@/components/pixel/pixel-divider'
import { FAQ_ITEMS } from '@/lib/faq-items'

export function PixelFaq() {
  return (
    <section className="flex flex-col gap-6">
      <PixelDivider label="FAQ" />

      <div className="text-center">
        <p className="tl-label">{'>'} Support</p>
        <h2 className="font-mono text-xl font-black tracking-tight sm:text-2xl">
          Frequently asked questions
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item, i) => (
          <details key={item.id} className="tl-box group">
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 font-mono text-sm font-bold marker:content-['']">
              <span className="tabular-nums" style={{ color: 'hsl(var(--tl-muted))' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1">{item.question}</span>
              <span aria-hidden className="font-black group-open:hidden">
                [+]
              </span>
              <span aria-hidden className="hidden font-black group-open:inline">
                [-]
              </span>
            </summary>
            <p
              className="border-t-2 px-4 py-3 text-[13px] leading-relaxed"
              style={{ borderColor: 'hsl(var(--tl-ink))', color: 'hsl(var(--tl-muted))' }}
            >
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
