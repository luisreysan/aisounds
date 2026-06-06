import type { ReactNode } from 'react'

import { DocsNav } from '@/components/docs/docs-nav'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <DocsNav />
        </aside>
        <article className="tl-prose prose prose-neutral max-w-none prose-headings:font-mono prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-pre:bg-transparent prose-pre:p-0 prose-code:font-mono prose-code:text-[0.9em] prose-code:before:content-none prose-code:after:content-none prose-a:underline-offset-4">
          {children}
        </article>
      </div>
    </main>
  )
}
