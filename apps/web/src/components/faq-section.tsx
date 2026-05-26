'use client'

import { Info } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FadeIn } from '@/components/motion/fade-in'

const FAQ_ITEMS = [
  {
    id: 'cpu',
    question: 'Is it safe for my CPU performance?',
    answer:
      'Absolutely. Sound packs load short local audio buffers (under 25kb per sound) managed directly by node-speaker at low priority. There are no external network calls that slow down your build or interrupt flow while coding in Cursor or Claude Code.',
  },
  {
    id: 'install',
    question: 'How do I install a sound pack?',
    answer:
      'Browse packs on AI Sounds, pick one you like, and run the install command shown on the pack page with the aisounds CLI. It maps AISE events to your sounds in Cursor, VS Code, Claude Code, Windsurf, or Aider.',
  },
  {
    id: 'create',
    question: 'Can I create my own pack?',
    answer:
      'Yes. Sign in with GitHub, go to Upload, and follow the three-step wizard: set metadata, upload sounds for each AISE event, then publish. Your pack appears in the community catalog once published.',
  },
  {
    id: 'tools',
    question: 'Which tools are compatible?',
    answer:
      'Cursor, VS Code, Claude Code, Windsurf, and Aider are supported today. Each pack lists which tools it targets. The CLI installs event mappings into the right config for your editor.',
  },
  {
    id: 'cost',
    question: 'How much do packs cost?',
    answer:
      'All community packs on AI Sounds are free to browse, download, and install. Licenses vary per pack (CC0, CC-BY, MIT, etc.) — check the pack detail page before remixing or redistributing.',
  },
] as const

export function FaqSection() {
  return (
    <FadeIn className="space-y-6">
      <div className="text-center">
        <p className="retro-label mb-2">Support</p>
        <h2 className="retro-heading">Frequently asked questions</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Everything you need to know before installing your first pack.
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        className="retro-card divide-y divide-border overflow-hidden px-4 sm:px-6"
      >
        {FAQ_ITEMS.map((item) => (
          <AccordionItem key={item.id} value={item.id} className="border-border">
            <AccordionTrigger className="gap-3 hover:no-underline">
              <span className="flex items-start gap-3">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span>{item.question}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pl-7">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </FadeIn>
  )
}
