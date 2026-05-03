import type { MDXComponents } from 'mdx/types'

import { CodeBlock } from '@/components/docs/code-block'

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
  }
}
