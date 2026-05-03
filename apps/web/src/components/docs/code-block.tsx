'use client'

import { Children, isValidElement, type ReactNode, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

interface CodeBlockProps {
  children?: ReactNode
  className?: string
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children)
  }
  return ''
}

export function CodeBlock({ children, className, ...rest }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const onCopy = async () => {
    const text = preRef.current?.innerText ?? extractText(children)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy, select the text manually')
    }
  }

  return (
    <div className="group relative my-4">
      <pre
        ref={preRef}
        className={cn(
          'overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm leading-relaxed',
          className,
        )}
        {...rest}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy code to clipboard"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
