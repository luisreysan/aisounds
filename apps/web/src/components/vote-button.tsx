'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { toggleVoteAction } from '@/app/packs/actions'
import { cn } from '@/lib/utils'

export interface VoteButtonProps {
  packId: string
  packSlug?: string
  initialVoted: boolean
  initialCount: number
  isAuthenticated: boolean
  size?: 'sm' | 'default'
  /** Use on pack detail hero (gradient + inherited text-white). */
  onHero?: boolean
}

type VoteState = { voted: boolean; count: number }

export function VoteButton({
  packId,
  packSlug,
  initialVoted,
  initialCount,
  isAuthenticated,
  size = 'default',
  onHero = false,
}: VoteButtonProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [state, toggleOptimistic] = useOptimistic<VoteState, void>(
    { voted: initialVoted, count: initialCount },
    (prev) => ({
      voted: !prev.voted,
      count: prev.count + (prev.voted ? -1 : 1),
    }),
  )

  const onClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/packs/${packSlug ?? ''}`)}`)
      return
    }
    startTransition(async () => {
      toggleOptimistic()
      const result = await toggleVoteAction(packId, packSlug)
      if (!result.ok) {
        if (result.reason === 'unauthenticated') {
          toast.error('You need to sign in to vote.')
          router.push('/login')
        } else {
          toast.error('Could not toggle your vote.', { description: result.message })
        }
      }
    })
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      variant={onHero ? 'ghost' : state.voted ? 'default' : 'outline'}
      size={size}
      className={cn(
        onHero &&
          (state.voted
            ? 'border-transparent bg-white/25 text-white hover:bg-white/35 hover:text-white'
            : 'border-white/40 bg-black/25 text-white hover:bg-black/35 hover:text-white'),
        !onHero && state.voted && 'border-transparent',
      )}
      aria-pressed={state.voted}
    >
      <Heart className={cn('h-4 w-4', state.voted && 'fill-current')} />
      <span className="tabular-nums">{state.count}</span>
    </Button>
  )
}
