'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { deletePackAction, updatePackDetailsAction } from '@/app/packs/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PackOwnerControlsProps {
  packId: string
  packSlug: string
  initialName: string
  initialDescription: string | null
  authorUsername: string
}

export function PackOwnerControls({
  packId,
  packSlug,
  initialName,
  initialDescription,
  authorUsername,
}: PackOwnerControlsProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [isPending, startTransition] = useTransition()

  const saveChanges = () => {
    startTransition(async () => {
      const result = await updatePackDetailsAction({
        packId,
        name: name.trim(),
        description: description.trim() || null,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Pack updated')
      setIsEditing(false)
      router.refresh()
    })
  }

  const deletePack = () => {
    startTransition(async () => {
      const result = await deletePackAction(packId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Pack deleted permanently')
      router.push(`/profile/${authorUsername}`)
      router.refresh()
    })
  }

  return (
    <div className="w-full rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">Owner controls for /packs/{packSlug}</div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} disabled={isPending}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(initialName)
                setDescription(initialDescription ?? '')
                setIsEditing(false)
              }}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>URL slug (permanent)</Label>
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-sm">
              <span className="text-muted-foreground">/packs/</span>
              <span className="truncate">{packSlug}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The URL slug is the unique reference for this pack and{' '}
              <strong className="text-foreground">cannot be changed</strong>. Only the display
              name and description below are editable.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`pack-name-${packId}`}>Display name</Label>
            <Input
              id={`pack-name-${packId}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="Pack display name"
              disabled={isPending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`pack-description-${packId}`}>Description</Label>
            <Textarea
              id={`pack-description-${packId}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What vibe does this pack bring?"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-destructive">
              Deletion is irreversible. You will not be able to recover this data.
            </p>
            <Button size="sm" onClick={saveChanges} disabled={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl">
            <h3 className="text-base font-semibold">Delete this pack permanently?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone. All sounds and pack data will be permanently removed.
            </p>
            <p className="mt-3 text-xs text-destructive">
              Once deleted, there is no way to recover this data.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  deletePack()
                }}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete forever
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
