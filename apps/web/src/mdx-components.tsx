import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef } from 'react'

import { CodeBlock } from '@/components/docs/code-block'

const tableShell =
  'not-prose my-6 overflow-x-auto rounded-lg border border-border/80 bg-muted/20 shadow-sm'

const tableClass =
  'min-w-full border-collapse border-spacing-0 text-left text-sm [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:nth-child(even)]:bg-background/50 [&_tbody_tr:nth-child(odd)]:bg-muted/25 [&_td]:border-b [&_td]:border-border/50 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:bg-muted/70 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_code]:rounded [&_code]:bg-muted/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]'

/**
 * Required by @next/mdx. Customizes how MDX elements render in /docs.
 * The `pre` override wraps every code block in our CodeBlock component, which
 * adds a copy-to-clipboard button so visitors can easily paste snippets into
 * AI tools.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: (props) => <CodeBlock {...props} />,
    table: (props: ComponentPropsWithoutRef<'table'>) => (
      <div className={tableShell}>
        <table className={tableClass} {...props} />
      </div>
    ),
  }
}
