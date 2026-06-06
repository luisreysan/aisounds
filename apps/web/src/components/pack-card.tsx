'use client'

import { motion } from 'framer-motion'

import { PixelPackCard } from '@/components/pixel/pixel-pack-card'
import type { PackCardRow } from '@/lib/supabase/types'

export function PackCard({ pack }: { pack: PackCardRow }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <PixelPackCard pack={pack} />
    </motion.div>
  )
}
