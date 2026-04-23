import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" />
        Scaffolding phase · v0.0.0
      </div>

      <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
        AI Sounds
      </h1>

      <p className="max-w-xl text-balance text-lg text-muted-foreground">
        Open source community platform for sound packs that play in your AI coding tool — Cursor,
        VS Code, Claude Code, Windsurf and more.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-sm">
        <Link
          href="/packs"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse packs
        </Link>
        <Link
          href="/docs"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border px-6 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          AISE standard
        </Link>
      </div>

      <p className="pt-8 font-mono text-xs text-muted-foreground">
        npx aisounds install &lt;slug&gt;
      </p>
    </main>
  )
}
