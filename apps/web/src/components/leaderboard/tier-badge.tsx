import { getCreatorTier } from '@/lib/creator-tiers'
import { cn } from '@/lib/utils'

export interface TierBadgeProps {
  score: number
  className?: string
  showLabel?: boolean
}

export function TierBadge({ score, className, showLabel = true }: TierBadgeProps) {
  const tier = getCreatorTier(score)
  const Icon = tier.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', tier.colorClass)} aria-hidden />
      {showLabel ? <span className={tier.colorClass}>{tier.name}</span> : null}
    </span>
  )
}
