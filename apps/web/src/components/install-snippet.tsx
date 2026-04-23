'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, MessageSquare, Terminal } from 'lucide-react'
import { toast } from 'sonner'

import type { SupportedTool } from '@aisounds/core'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TOOL_OPTIONS } from '@/lib/catalog'
import { cn } from '@/lib/utils'

export interface InstallSnippetProps {
  packSlug: string
  packName: string
  tools: string[]
}

const VERIFY_HINTS: Partial<Record<SupportedTool, string>> = {
  cursor:
    'Verify: .cursor/hooks.json should have entries under "stop" pointing to .cursor/hooks/aisounds/',
  'claude-code':
    'Verify: .claude/settings.json should have aisounds hook entries.',
}

const TOOL_DESCRIPTIONS: Partial<Record<SupportedTool, string>> = {
  cursor: 'This configures Cursor hooks that play sounds when agent tasks complete or fail.',
  'claude-code': 'This configures Claude Code hooks that play notification sounds.',
  vscode: 'This configures VS Code hooks that play sounds on chat events.',
}

function toolLabel(slug: string): string {
  return TOOL_OPTIONS.find((t) => t.slug === slug)?.label ?? slug
}

function buildCommand(slug: string, tool: string): string {
  return `npx aisounds@latest install ${slug} --tool ${tool}`
}

function buildPrompt(slug: string, name: string, tool: string): string {
  const label = toolLabel(tool)
  const verify = VERIFY_HINTS[tool as SupportedTool]
  const desc = TOOL_DESCRIPTIONS[tool as SupportedTool] ?? `This configures ${label} hooks that play sounds on AI events.`

  const lines = [
    `Install the sound pack "${name}" from aisounds.dev for ${label}.`,
    '',
    'Steps:',
    `1. Run in terminal: npx aisounds@latest install ${slug} --tool ${tool}`,
    `2. Run in terminal: npx aisounds@latest activate ${slug}`,
  ]
  if (verify) {
    lines.push(`3. ${verify}`)
  }
  lines.push('', desc)
  return lines.join('\n')
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-6 w-6 shrink-0 p-0 text-white hover:bg-white/10 hover:text-white', className)}
      onClick={onCopy}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

function ToolPills({
  tools,
  selected,
  onSelect,
}: {
  tools: string[]
  selected: string
  onSelect: (tool: string) => void
}) {
  if (tools.length <= 1) return null
  return (
    <div className="flex gap-1">
      {tools.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(t)}
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
            selected === t
              ? 'bg-white/20 text-white'
              : 'text-white/50 hover:bg-white/10 hover:text-white/80',
          )}
        >
          {toolLabel(t)}
        </button>
      ))}
    </div>
  )
}

export function InstallSnippet({ packSlug, packName, tools }: InstallSnippetProps) {
  const effectiveTools = tools.length > 0 ? tools : ['cursor']
  const [selectedTool, setSelectedTool] = useState(effectiveTools[0] ?? 'cursor')

  const command = useMemo(
    () => buildCommand(packSlug, selectedTool),
    [packSlug, selectedTool],
  )
  const prompt = useMemo(
    () => buildPrompt(packSlug, packName, selectedTool),
    [packSlug, packName, selectedTool],
  )

  return (
    <Tabs defaultValue="terminal" className="w-full">
      <div className="rounded-lg border border-white/20 bg-black/30 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <TabsList className="h-7 bg-white/10 p-0.5">
            <TabsTrigger
              value="terminal"
              className="h-6 gap-1 rounded-md px-2 text-[10px] text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <Terminal className="h-3 w-3" />
              Terminal
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="h-6 gap-1 rounded-md px-2 text-[10px] text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <MessageSquare className="h-3 w-3" />
              Paste in chat
            </TabsTrigger>
          </TabsList>
          <ToolPills tools={effectiveTools} selected={selectedTool} onSelect={setSelectedTool} />
        </div>

        <TabsContent value="terminal" className="mt-0 px-3 pb-2 pt-1.5">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 shrink-0 text-white/70" />
            <code className="truncate font-mono text-xs text-white">{command}</code>
            <CopyButton text={command} />
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-0 px-3 pb-2 pt-1.5">
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" />
            <pre className="min-w-0 flex-1 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-white/90">
              {prompt}
            </pre>
            <CopyButton text={prompt} className="mt-0.5" />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
