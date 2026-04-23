'use client'

import { useState } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export interface InstallSnippetProps {
  packSlug: string
  tool?: 'cursor' | 'claude-code' | null
}

/**
 * Small inline code block shown on the pack detail page so users can copy
 * the `npx aisounds install` command matching the tool they care about.
 * Cursor and Claude Code are the tools implemented in Phase 4.
 */
export function InstallSnippet({ packSlug, tool = null }: InstallSnippetProps) {
  const [copied, setCopied] = useState(false)

  const command = tool
    ? `npx aisounds install ${packSlug} --tool ${tool}`
    : `npx aisounds install ${packSlug}`

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy, select the text manually')
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-xs text-white backdrop-blur">
      <Terminal className="h-3.5 w-3.5 opacity-70" />
      <code className="truncate">{command}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-white hover:bg-white/10 hover:text-white"
        onClick={onCopy}
        aria-label="Copy install command"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}
