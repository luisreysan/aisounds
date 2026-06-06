import { PixelHeaderInner } from '@/components/pixel/pixel-header-inner'
import { getCurrentProfile } from '@/lib/auth'

export async function PixelHeader() {
  const profile = await getCurrentProfile()

  return (
    <PixelHeaderInner
      profile={
        profile
          ? {
              username: profile.username,
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
            }
          : null
      }
    />
  )
}
