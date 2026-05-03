'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

export interface DocsNavItem {
  href: string
  label: string
}

export interface DocsNavSection {
  title: string
  items: DocsNavItem[]
}

export const DOCS_NAV: DocsNavSection[] = [
  {
    title: 'Introduction',
    items: [
      { href: '/docs', label: 'Overview' },
      { href: '/docs/getting-started', label: 'Getting started' },
    ],
  },
  {
    title: 'Concepts',
    items: [
      { href: '/docs/concepts', label: 'Tools and scopes' },
      { href: '/docs/events', label: 'AISE events' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { href: '/docs/cli', label: 'CLI reference' },
      { href: '/docs/for-llms', label: 'For AI agents' },
    ],
  },
]

export function DocsNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Docs navigation" className="flex flex-col gap-6 text-sm">
      {DOCS_NAV.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <h4 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h4>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block rounded-md px-2 py-1 text-sm transition-colors',
                      active
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
