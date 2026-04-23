'use client'

import { motion } from 'framer-motion'

import { PackCard } from '@/components/pack-card'
import type { PackCardRow } from '@/lib/supabase/types'

export function PackGrid({ packs }: { packs: PackCardRow[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {packs.map((pack) => (
        <motion.div
          key={pack.id}
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <PackCard pack={pack} />
        </motion.div>
      ))}
    </motion.div>
  )
}
