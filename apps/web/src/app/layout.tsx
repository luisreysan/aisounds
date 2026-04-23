import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

import { SiteHeader } from '@/components/site-header'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AI Sounds — Sound packs for AI coding tools',
    template: '%s · AI Sounds',
  },
  description:
    'Upload, share, vote, remix and install sound packs for Cursor, VS Code, Claude Code, Windsurf and other AI coding tools.',
  metadataBase: new URL('https://aisounds.dev'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <SiteHeader />
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
