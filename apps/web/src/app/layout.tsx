import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

import { InvertProvider } from '@/components/pixel/invert-provider'
import { PixelShell } from '@/components/pixel/pixel-shell'
import { ThemeScript } from '@/components/pixel/theme-script'
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
      data-theme="night"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <InvertProvider>
          <PixelShell>{children}</PixelShell>
          <Toaster position="bottom-right" richColors />
        </InvertProvider>
      </body>
    </html>
  )
}
