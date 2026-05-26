'use client'

import { useTransition } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export interface DownloadButtonProps {
  packSlug: string
  /** Number of sounds in the pack — used only to decide the empty state. */
  soundCount: number
}

/**
 * Triggers the server bundle endpoint (`/api/packs/<slug>/bundle`). Download
 * counts are recorded only by that endpoint (single source of truth).
 */
export function DownloadButton({ packSlug, soundCount }: DownloadButtonProps) {
  const [isPending, startTransition] = useTransition()

  const onClick = () => {
    if (soundCount === 0) {
      toast.error('No sounds available in this pack yet.')
      return
    }

    startTransition(async () => {
      const platform = detectPlatform()
      const params = new URLSearchParams()
      if (platform) params.set('platform', platform)
      const url = `/api/packs/${encodeURIComponent(packSlug)}/bundle${
        params.size > 0 ? `?${params.toString()}` : ''
      }`

      const link = document.createElement('a')
      link.href = url
      link.download = `${packSlug}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Download started', {
        description: `Unzip and run \`npx @aisounds/cli install ${packSlug}\` to wire it into your AI tool.`,
      })
    })
  }

  return (
    <Button type="button" onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : <Download />}
      Download
    </Button>
  )
}

function detectPlatform(): 'mac' | 'windows' | 'linux' | null {
  if (typeof window === 'undefined') return null
  const ua = window.navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'mac'
  if (ua.includes('win')) return 'windows'
  if (ua.includes('linux')) return 'linux'
  return null
}
