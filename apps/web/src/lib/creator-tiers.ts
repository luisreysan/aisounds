import type { LucideIcon } from 'lucide-react'
import { Crown, Headphones, Music, Music2, SlidersHorizontal } from 'lucide-react'

export interface CreatorTier {
  name: string
  icon: LucideIcon
  colorClass: string
  minScore: number
}

const CREATOR_TIERS: CreatorTier[] = [
  { name: 'Audio Legend', minScore: 2000, icon: Crown, colorClass: 'text-amber-500' },
  { name: 'Sound Architect', minScore: 500, icon: SlidersHorizontal, colorClass: 'text-purple-500' },
  { name: 'Audio Crafter', minScore: 100, icon: Headphones, colorClass: 'text-blue-500' },
  { name: 'Beat Maker', minScore: 25, icon: Music2, colorClass: 'text-emerald-500' },
  { name: 'Sound Novice', minScore: 0, icon: Music, colorClass: 'text-zinc-400' },
]

/** Returns the highest tier the creator qualifies for at the given score. */
export function getCreatorTier(score: number): CreatorTier {
  for (const tier of CREATOR_TIERS) {
    if (score >= tier.minScore) return tier
  }
  return CREATOR_TIERS[CREATOR_TIERS.length - 1]!
}
