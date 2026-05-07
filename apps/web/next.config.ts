import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aisounds/core'],
  pageExtensions: ['ts', 'tsx', 'mdx'],
  typedRoutes: true,
  // ffmpeg-static and fluent-ffmpeg must not be bundled — they read binaries at runtime
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  outputFileTracingIncludes: {
    // Ensure ffmpeg-static binary is packaged with the upload route on Vercel.
    '/api/upload/sound': [
      'node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/**',
      'node_modules/ffmpeg-static/**',
    ],
    '/api/upload/sound/route': [
      'node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/**',
      'node_modules/ffmpeg-static/**',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

const withMDX = createMDX({
  options: {
    /* GitHub-flavored Markdown: pipe tables, strikethrough, autolinks, etc.
       Plugin referenced by package name (string) so the loader options remain
       serializable under Next.js 15 / Turbopack. */
    remarkPlugins: [['remark-gfm']],
  },
})

export default withMDX(nextConfig)
