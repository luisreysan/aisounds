import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Github, Upload } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PackGrid } from '@/components/pack-grid'
import { getSessionUser } from '@/lib/auth'
import { formatRelativeTime } from '@/lib/format'
import { getProfileByUsername, listPacksByAuthor } from '@/lib/profiles'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) return { title: `@${username}` }
  return {
    title: `${profile.display_name ?? profile.username}`,
    description: profile.bio ?? `Sound packs published by @${profile.username}.`,
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const viewer = await getSessionUser()
  const isOwner = viewer?.id === profile.id

  const packs = await listPacksByAuthor(profile.id, isOwner)
  const publishedCount = packs.filter((p) => p.status === 'published').length
  const draftCount = packs.filter((p) => p.status === 'draft').length

  const totalVotes = packs.reduce((sum, p) => sum + (p.vote_count ?? 0), 0)
  const totalDownloads = packs.reduce((sum, p) => sum + (p.download_count ?? 0), 0)

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/30 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.username} />
            ) : null}
            <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.display_name ?? profile.username}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">@{profile.username}</span>
              <span>·</span>
              <span>joined {formatRelativeTime(profile.created_at)}</span>
              {profile.is_admin ? <Badge variant="secondary">admin</Badge> : null}
            </div>
            {profile.bio ? (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{publishedCount}</strong> packs
            </span>
            <span>
              <strong className="text-foreground">{totalVotes}</strong> votes
            </span>
            <span>
              <strong className="text-foreground">{totalDownloads}</strong> downloads
            </span>
          </div>
          <div className="flex items-center gap-2">
            {profile.github_url ? (
              <Button asChild size="sm" variant="outline">
                <Link href={profile.github_url} target="_blank" rel="noreferrer noopener">
                  <Github />
                  GitHub
                </Link>
              </Button>
            ) : null}
            {isOwner ? (
              <Button asChild size="sm">
                <Link href="/upload">
                  <Upload />
                  Upload pack
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            {isOwner ? 'Your packs' : 'Published packs'}
          </h2>
          {isOwner && draftCount > 0 ? (
            <span className="text-sm text-muted-foreground">
              {draftCount} draft{draftCount === 1 ? '' : 's'} (only visible to you)
            </span>
          ) : null}
        </div>

        {packs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            {isOwner
              ? 'You have no packs yet. Upload your first one to get started.'
              : 'This user has not published any packs yet.'}
          </div>
        ) : (
          <PackGrid packs={packs} />
        )}
      </section>
    </main>
  )
}
