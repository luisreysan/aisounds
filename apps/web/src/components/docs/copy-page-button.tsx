'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface CopyPageButtonProps {
  /** Path to the raw markdown file under /public, e.g. `/docs-md/concepts.md` */
  source: string
  label?: string
}

/**
 * Fetches the raw markdown of the current docs page and copies it to the
 * clipboard. Useful for pasting docs into AI tools (Cursor, Claude, ChatGPT).
 */
export function CopyPageButton({ source, label = 'Copy as Markdown' }: CopyPageButtonProps) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      const res = await fetch(source)
      if (!res.ok) throw new Error(`Could not fetch ${source}`)
      const md = await res.text()
      await navigator.clipboard.writeText(md)
      setCopied(true)
      toast.success('Page copied as Markdown')
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not copy page')
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy} className="gap-2">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  )
}
