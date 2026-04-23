import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileAudio, Github, ShieldCheck, Terminal } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DownloadButton } from '@/components/download-button'
import { InstallSnippet } from '@/components/install-snippet'
import { PackOwnerControls } from '@/components/pack-owner-controls'
import { VoteButton } from '@/components/vote-button'
import { WaveformPlayer } from '@/components/waveform-player'
import { getPackBySlug, hasUserVoted } from '@/lib/packs'
import { getSessionUser } from '@/lib/auth'
import { TOOL_OPTIONS } from '@/lib/catalog'
import { formatDurationMs, formatRelativeTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const detail = await getPackBySlug(slug)
  if (!detail) return { title: 'Pack not found' }
  return {
    title: detail.pack.name,
    description: detail.pack.description ?? undefined,
  }
}

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const detail = await getPackBySlug(slug)
  if (!detail) notFound()

  const { pack, sounds } = detail
  const coverColor = pack.cover_color || '#6366f1'
  const gradient = `radial-gradient(ellipse at 20% 0%, ${coverColor}, ${shade(coverColor, -0.45)})`

  const [user, initialVoted] = await Promise.all([
    getSessionUser(),
    hasUserVoted(pack.id),
  ])
  const isAuthed = !!user
  const isOwner = user?.id === pack.author_id

  const toolLabels = (pack.tool_slugs ?? []).map(
    (slugValue) => TOOL_OPTIONS.find((t) => t.slug === slugValue)?.label ?? slugValue,
  )

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section
        className="rounded-2xl border border-border/60 p-8 text-white shadow-sm"
        style={{ background: gradient }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
              <span>AISE v{pack.aise_version}</span>
              <span>·</span>
              <span>{pack.license}</span>
              {pack.forked_from_id ? (
                <>
                  <span>·</span>
                  <span>remix</span>
                </>
              ) : null}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight drop-shadow">{pack.name}</h1>
            {pack.description ? (
              <p className="max-w-2xl text-sm leading-relaxed opacity-90">{pack.description}</p>
            ) : null}
            <div className="flex items-center gap-3 pt-1 text-sm">
              <Avatar className="h-7 w-7 ring-2 ring-white/30">
                {pack.author_avatar_url ? (
                  <AvatarImage src={pack.author_avatar_url} alt={pack.author_username} />
                ) : null}
                <AvatarFallback>
                  {pack.author_username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link
                href={`/profile/${pack.author_username}`}
                className="font-medium hover:underline"
              >
                @{pack.author_username}
              </Link>
              {pack.published_at ? (
                <span className="opacity-75">
                  · published {formatRelativeTime(pack.published_at)}
                </span>
              ) : (
                <Badge variant="outline" className="border-white/40 text-white">
                  Draft
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <div className="flex items-center gap-3">
              <VoteButton
                packId={pack.id}
                initialVoted={initialVoted}
                initialCount={pack.vote_count}
                isAuthenticated={isAuthed}
              />
              <DownloadButton
                packId={pack.id}
                packSlug={pack.slug}
                soundCount={sounds.length}
              />
            </div>
            <InstallSnippet packSlug={pack.slug} />
          </div>
        </div>
      </section>

      {isOwner ? (
        <PackOwnerControls
          packId={pack.id}
          packSlug={pack.slug}
          initialName={pack.name}
          initialDescription={pack.description}
          authorUsername={pack.author_username}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetaCard icon={<Terminal className="h-4 w-4" />} label="Tools">
          {toolLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {toolLabels.map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Not specified</span>
          )}
        </MetaCard>
        <MetaCard icon={<FileAudio className="h-4 w-4" />} label="Tags">
          {(pack.tag_names?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {(pack.tag_names ?? []).map((name) => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">No tags</span>
          )}
        </MetaCard>
        <MetaCard icon={<ShieldCheck className="h-4 w-4" />} label="Stats">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{pack.vote_count}</strong> votes
            </span>
            <span>
              <strong className="text-foreground">{pack.download_count}</strong> downloads
            </span>
            <span>
              <strong className="text-foreground">{pack.sound_count}</strong> sounds
            </span>
          </div>
        </MetaCard>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Sounds</h2>
          <span className="text-sm text-muted-foreground">
            {sounds.length} event{sounds.length === 1 ? '' : 's'} mapped
          </span>
        </div>

        {sounds.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            This pack has no sounds yet. If you are the author, finish uploading before
            publishing.
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {sounds.map((sound) => (
              <li key={sound.id}>
                <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4">
                  <div className="w-full md:w-56">
                    <div className="font-mono text-sm font-medium">{sound.event}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDurationMs(sound.duration_ms)}</span>
                      <span>·</span>
                      <span className="uppercase">
                        {sound.original_format ?? 'ogg'}
                      </span>
                      {sound.is_loop ? (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                          loop
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <WaveformPlayer
                      src={sound.public_url_ogg}
                      durationMs={sound.duration_ms}
                      color={coverColor}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="pt-4 text-xs text-muted-foreground">
        <Link
          href={pack.author_username ? `https://github.com/${pack.author_username}` : '#'}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Github className="h-3.5 w-3.5" />
          Author on GitHub
        </Link>
      </footer>
    </main>
  )
}

function MetaCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </Card>
  )
}

function shade(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const num = parseInt(normalized, 16)
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * (1 + amount))))
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * (1 + amount))))
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * (1 + amount))))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
