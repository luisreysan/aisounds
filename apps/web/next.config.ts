import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aisounds/core'],
  experimental: {
    typedRoutes: true,
  },
  // ffmpeg-static and fluent-ffmpeg must not be bundled — they read binaries at runtime
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

export default nextConfig
