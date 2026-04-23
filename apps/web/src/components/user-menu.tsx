'use client'

import Link from 'next/link'
import { LogOut, User as UserIcon, Upload, LayoutDashboard } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/auth/actions'

export type UserMenuProfile = {
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export function UserMenu({ profile }: { profile: UserMenuProfile }) {
  const initials = (profile.displayName ?? profile.username).slice(0, 2).toUpperCase()
  const profileHref = `/profile/${profile.username}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar>
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt={profile.username} />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{profile.displayName ?? profile.username}</span>
          <span className="font-mono text-xs text-muted-foreground">@{profile.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <UserIcon />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/upload">
            <Upload />
            Upload pack
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/packs">
            <LayoutDashboard />
            Browse packs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
