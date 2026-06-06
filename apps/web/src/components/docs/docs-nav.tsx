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
    <nav aria-label="Docs navigation" className="tl-box-flat flex flex-col gap-4 p-3 text-sm">
      {DOCS_NAV.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <h4 className="tl-label px-1">{section.title}</h4>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block px-2 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-all',
                      active
                        ? 'tl-pill-active'
                        : 'opacity-70 hover:opacity-100',
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
