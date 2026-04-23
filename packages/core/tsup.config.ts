import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/events.ts', 'src/manifest.ts', 'src/mappings.ts', 'src/rules.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
})
