/**
 * Deterministic gradient generator seeded by pack slug.
 *
 * Given the same slug, this always returns the same CSS gradient string.
 * No data needs to be stored in the database — the gradient is derived
 * purely from the slug at render time.
 */

/** FNV-1a 32-bit hash turned into a simple PRNG. */
function makeRng(seed: string): () => number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  // xorshift32 with the FNV hash as the initial state
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    h = h >>> 0
    return h / 0x100000000
  }
}

/** Generates a rich HSL color string biased towards vibrant, dark-ish tones. */
function randomColor(rng: () => number): string {
  const hue = Math.floor(rng() * 360)
  const sat = Math.floor(55 + rng() * 40) // 55–95 %
  const lit = Math.floor(28 + rng() * 28) // 28–56 % (readable with white text)
  return `hsl(${hue}, ${sat}%, ${lit}%)`
}

/**
 * Returns a CSS `background` value (a gradient) that is unique and
 * deterministic for the given pack slug.
 */
export function generateGradient(slug: string): string {
  const rng = makeRng(slug || 'default')

  // Pick gradient type: 0 = linear, 1 = radial, 2 = conic
  const typeIdx = Math.floor(rng() * 3)

  // 2 to 4 color stops
  const stopCount = 2 + Math.floor(rng() * 3)
  const colors: string[] = Array.from({ length: stopCount }, () => randomColor(rng))

  if (typeIdx === 1) {
    const shape = rng() < 0.5 ? 'circle' : 'ellipse'
    const x = Math.floor(10 + rng() * 80)
    const y = Math.floor(10 + rng() * 80)
    return `radial-gradient(${shape} at ${x}% ${y}%, ${colors.join(', ')})`
  }

  if (typeIdx === 2) {
    const fromAngle = Math.floor(rng() * 360)
    const x = Math.floor(10 + rng() * 80)
    const y = Math.floor(10 + rng() * 80)
    return `conic-gradient(from ${fromAngle}deg at ${x}% ${y}%, ${colors.join(', ')})`
  }

  const angle = Math.floor(rng() * 360)
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`
}
