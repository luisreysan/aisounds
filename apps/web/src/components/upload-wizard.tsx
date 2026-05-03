'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  ALL_EVENTS,
  EVENT_SPEC,
  hookMappingsForEvent,
  supportedEventsForTools,
  type SoundEvent,
  type SupportedTool,
} from '@aisounds/core'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WaveformPlayer } from '@/components/waveform-player'
import {
  createPackDraftAction,
  deleteDraftAction,
  previewPackSlugAction,
  publishPackAction,
} from '@/app/upload/actions'
import { LICENSE_OPTIONS, TAG_OPTIONS, TOOL_OPTIONS } from '@/lib/catalog'
import { formatDurationMs, formatBytes, slugify } from '@/lib/format'
import { generateGradient } from '@/lib/gradient'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

interface DraftState {
  packId: string
  slug: string
}

interface SoundState {
  status: 'idle' | 'uploading' | 'deleting' | 'done' | 'error'
  publicUrlOgg?: string
  durationMs?: number
  sizeBytes?: number
  error?: string
}

const MAX_FILE_BYTES = 1_048_576
const MAX_DURATION_MS = 10_000

export function UploadWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [license, setLicense] = useState<'CC0' | 'CC-BY' | 'CC-BY-SA' | 'MIT'>('CC0')
  const [tags, setTags] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])

  const [draft, setDraft] = useState<DraftState | null>(null)
  const [sounds, setSounds] = useState<Record<string, SoundState>>({})
  const [isSubmitting, startSubmitting] = useTransition()
  const [previewSlug, setPreviewSlug] = useState<string>('—')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const slugRequestIdRef = useRef(0)

  const baseSlug = useMemo(() => slugify(name) || '—', [name])

  const filteredEvents: SoundEvent[] = useMemo(
    () => supportedEventsForTools(tools as SupportedTool[]),
    [tools],
  )

  const requiredEvents: SoundEvent[] = useMemo(
    () => filteredEvents.filter((e) => EVENT_SPEC[e].required),
    [filteredEvents],
  )

  const canProceedFromStep1 = name.trim().length >= 2 && name.trim().length <= 80
  const hasRequiredUploads = requiredEvents.every((e) => sounds[e]?.status === 'done')

  useEffect(() => {
    if (draft?.slug) return

    const normalized = name.trim()
    if (normalized.length < 2 || normalized.length > 80) {
      setPreviewSlug(baseSlug)
      setIsPreviewLoading(false)
      return
    }

    const requestId = ++slugRequestIdRef.current
    setIsPreviewLoading(true)

    const timer = setTimeout(() => {
      void previewPackSlugAction(normalized)
        .then((result) => {
          if (slugRequestIdRef.current !== requestId) return
          setPreviewSlug(result.slug ?? baseSlug)
        })
        .catch(() => {
          if (slugRequestIdRef.current !== requestId) return
          setPreviewSlug(baseSlug)
        })
        .finally(() => {
          if (slugRequestIdRef.current !== requestId) return
          setIsPreviewLoading(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [name, baseSlug, draft?.slug])

  const createDraft = () => {
    if (!canProceedFromStep1) {
      toast.error('Pack name must be between 2 and 80 characters.')
      return
    }
    startSubmitting(async () => {
      const result = await createPackDraftAction({
        name: name.trim(),
        description: description.trim() || null,
        license,
        tags,
        tools,
        preferredSlug: previewSlug !== '—' ? previewSlug : undefined,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDraft({ packId: result.packId, slug: result.slug })
      setStep(2)
      toast.success('Draft created', {
        description: `URL slug (permanent): ${result.slug}`,
      })
    })
  }

  const uploadSound = async (event: SoundEvent, file: File) => {
    if (!draft) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`File too large`, {
        description: `${file.name} is ${formatBytes(file.size)}, max is 1 MB.`,
      })
      return
    }

    setSounds((prev) => ({ ...prev, [event]: { status: 'uploading' } }))

    const form = new FormData()
    form.append('packId', draft.packId)
    form.append('event', event)
    form.append('file', file)

    try {
      const res = await fetch('/api/upload/sound', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? `Upload failed (${res.status})`)
      }
      setSounds((prev) => ({
        ...prev,
        [event]: {
          status: 'done',
          publicUrlOgg: data.publicUrlOgg,
          durationMs: data.durationMs,
          sizeBytes: data.sizeBytes,
        },
      }))
      toast.success(`Uploaded "${event}"`, {
        description: `${formatDurationMs(data.durationMs)} · ${formatBytes(data.sizeBytes)}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setSounds((prev) => ({ ...prev, [event]: { status: 'error', error: message } }))
      toast.error(`Could not upload "${event}"`, { description: message })
    }
  }

  const deleteSound = async (event: SoundEvent) => {
    if (!draft) return
    const previous = sounds[event]
    if (!previous || previous.status !== 'done') return

    setSounds((prev) => ({ ...prev, [event]: { ...previous, status: 'deleting' } }))

    try {
      const res = await fetch('/api/upload/sound', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: draft.packId, event }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? `Delete failed (${res.status})`)
      }

      setSounds((prev) => ({ ...prev, [event]: { status: 'idle' } }))
      toast.success(`Removed "${event}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      setSounds((prev) => ({ ...prev, [event]: { ...previous, status: 'done' } }))
      toast.error(`Could not remove "${event}"`, { description: message })
    }
  }

  const publish = () => {
    if (!draft) return
    if (!hasRequiredUploads) {
      toast.error('Upload the required sounds before publishing.')
      return
    }
    startSubmitting(async () => {
      const result = await publishPackAction(draft.packId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Pack published!')
      router.push(`/packs/${result.slug}`)
    })
  }

  const discardDraft = () => {
    if (!draft) return
    if (!confirm('Delete this draft? Uploaded sounds will be removed.')) return
    startSubmitting(async () => {
      const result = await deleteDraftAction(draft.packId)
      if (!result.ok) {
        toast.error(result.error ?? 'Could not delete the draft')
        return
      }
      toast.success('Draft deleted')
      setDraft(null)
      setSounds({})
      setStep(1)
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <WizardSteps current={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 ? (
            <StepMetadata
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              license={license}
              setLicense={setLicense}
              tags={tags}
              setTags={setTags}
              tools={tools}
              setTools={setTools}
              derivedSlug={previewSlug}
              isSlugLoading={isPreviewLoading}
              onNext={createDraft}
              isSubmitting={isSubmitting}
              disabled={!canProceedFromStep1 || !!draft}
              lockedSlug={draft?.slug}
            />
          ) : null}
          {step === 2 && draft ? (
            <StepSounds
              sounds={sounds}
              events={filteredEvents}
              tools={tools}
              onUpload={uploadSound}
              onDelete={deleteSound}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              onDiscard={discardDraft}
              canProceed={hasRequiredUploads}
            />
          ) : null}
          {step === 3 && draft ? (
            <StepReview
              name={name}
              description={description}
              slug={draft.slug}
              license={license}
              tags={tags}
              tools={tools}
              sounds={sounds}
              onBack={() => setStep(2)}
              onPublish={publish}
              onDiscard={discardDraft}
              isSubmitting={isSubmitting}
              canPublish={hasRequiredUploads}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function WizardSteps({ current }: { current: Step }) {
  const steps = [
    { id: 1, label: 'Metadata' },
    { id: 2, label: 'Sounds' },
    { id: 3, label: 'Review' },
  ] as const
  return (
    <ol className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium',
              current >= s.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground',
            )}
          >
            {s.id}
          </span>
          <span className={cn(current >= s.id ? 'text-foreground' : 'text-muted-foreground')}>
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <span className="mx-1 h-px w-8 bg-border" aria-hidden="true" />
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function StepMetadata(props: {
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  license: 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'MIT'
  setLicense: (v: 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'MIT') => void
  tags: string[]
  setTags: (v: string[]) => void
  tools: string[]
  setTools: (v: string[]) => void
  derivedSlug: string
  isSlugLoading: boolean
  onNext: () => void
  isSubmitting: boolean
  disabled: boolean
  lockedSlug?: string
}) {
  const toggle = (list: string[], setter: (v: string[]) => void, value: string, max: number) => {
    if (list.includes(value)) {
      setter(list.filter((v) => v !== value))
    } else if (list.length < max) {
      setter([...list, value])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pack details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            maxLength={80}
            placeholder="My awesome pack"
            disabled={!!props.lockedSlug}
          />
          <p className="text-xs text-muted-foreground">
            This is the title shown to users. It doesn&apos;t need to be unique and can be edited
            later from the pack page.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>URL slug</Label>
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-sm">
            <span className="text-muted-foreground">/packs/</span>
            <span className="truncate">
              {props.lockedSlug ?? props.derivedSlug}
              {!props.lockedSlug && props.isSlugLoading ? '...' : ''}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Unique reference used in the pack URL. It is auto-generated from the name, must be
            unique across the platform, and <strong className="text-foreground">cannot be changed</strong> after the draft is created.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            maxLength={400}
            value={props.description}
            onChange={(e) => props.setDescription(e.target.value)}
            placeholder="What vibe does this pack bring?"
            disabled={!!props.lockedSlug}
          />
        </div>

        <div className="space-y-1.5">
          <Label>License</Label>
          <Select
            value={props.license}
            onValueChange={(v) => props.setLicense(v as typeof props.license)}
            disabled={!!props.lockedSlug}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LICENSE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tags ({props.tags.length}/5)</Label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((t) => {
              const active = props.tags.includes(t.slug)
              return (
                <button
                  type="button"
                  key={t.slug}
                  onClick={() => toggle(props.tags, props.setTags, t.slug, 5)}
                  disabled={!!props.lockedSlug || (!active && props.tags.length >= 5)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    active
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Supported tools</Label>
          <div className="flex flex-wrap gap-2">
            {TOOL_OPTIONS.map((t) => {
              const active = props.tools.includes(t.slug)
              return (
                <button
                  type="button"
                  key={t.slug}
                  onClick={() => toggle(props.tools, props.setTools, t.slug, 10)}
                  disabled={!!props.lockedSlug}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    active
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <Separator />
        <div className="flex items-center justify-end gap-2">
          <Button onClick={props.onNext} disabled={props.disabled || props.isSubmitting}>
            {props.isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {props.lockedSlug ? 'Continue to sounds' : 'Create draft'}
            <ChevronRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StepSounds(props: {
  sounds: Record<string, SoundState>
  events: SoundEvent[]
  tools: string[]
  onUpload: (event: SoundEvent, file: File) => void
  onDelete: (event: SoundEvent) => void
  onBack: () => void
  onNext: () => void
  onDiscard: () => void
  canProceed: boolean
}) {
  const toolLabel = (slug: string) => {
    const found = TOOL_OPTIONS.find((t) => t.slug === slug)
    return found?.label ?? slug
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload sounds</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Upload audio for each event supported by your selected tools. You must provide at least
          the required events. Files are transcoded to OGG and MP3 server-side — max 1 MB and 10
          seconds each.
        </p>

        {props.tools.length > 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span>Showing {props.events.length} events supported by:</span>
            <div className="flex gap-1.5">
              {props.tools.map((t) => (
                <Badge key={t} variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {toolLabel(t)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <ul className="flex flex-col gap-2">
          {props.events.map((event) => (
            <SoundRow
              key={event}
              event={event}
              tools={props.tools}
              state={props.sounds[event]}
              onUpload={(file) => props.onUpload(event, file)}
              onDelete={() => props.onDelete(event)}
            />
          ))}
        </ul>

        <Separator />
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={props.onDiscard} className="text-destructive">
            <X />
            Delete draft
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={props.onBack}>
              <ChevronLeft />
              Back
            </Button>
            <Button onClick={props.onNext} disabled={!props.canProceed}>
              Review
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SoundRow({
  event,
  tools,
  state,
  onUpload,
  onDelete,
}: {
  event: SoundEvent
  tools: string[]
  state: SoundState | undefined
  onUpload: (file: File) => void
  onDelete: () => void
}) {
  const spec = EVENT_SPEC[event]
  const inputId = `file-${event}`
  const hookMappings = hookMappingsForEvent(tools as SupportedTool[], event)
  const toolLabel = (slug: string) => TOOL_OPTIONS.find((t) => t.slug === slug)?.label ?? slug

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border/60 p-3 md:flex-row md:items-center md:gap-4',
        spec.required && 'border-primary/30',
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 md:w-64">
        <div>
          <div className="font-mono text-sm font-medium">{event}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>max {formatDurationMs(MAX_DURATION_MS)}</span>
            {spec.required ? (
              <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                required
              </Badge>
            ) : null}
            {spec.loop ? (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                loop
              </Badge>
            ) : null}
          </div>
          {hookMappings.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {hookMappings.map((m) => (
                <Badge key={`${event}-${m.tool}-${m.hook}`} variant="outline" className="h-4 px-1.5 text-[10px]">
                  {toolLabel(m.tool)}: {m.hook}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <StatusIcon status={state?.status ?? 'idle'} />
      </div>

      <div className="min-w-0 flex-1">
        {state?.status === 'done' && state.publicUrlOgg ? (
          <div className="space-y-2">
            <WaveformPlayer src={state.publicUrlOgg} compact />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove audio
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {state?.status === 'error' ? (
              <p className="text-xs text-destructive">{state.error}</p>
            ) : null}
            <label
              htmlFor={inputId}
              className={cn(
                'flex h-10 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-card/30 px-3 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-accent',
                state?.status === 'uploading' && 'pointer-events-none opacity-60',
                state?.status === 'deleting' && 'pointer-events-none opacity-60',
              )}
            >
              {state?.status === 'uploading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {state?.status === 'error'
                    ? 'Try another file'
                    : 'Choose audio (mp3, wav, ogg, flac)'}
                </>
              )}
            </label>
          </div>
        )}
        <input
          id={inputId}
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onUpload(file)
              e.target.value = ''
            }
          }}
        />
      </div>
    </li>
  )
}

function StatusIcon({ status }: { status: SoundState['status'] }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (status === 'uploading') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  if (status === 'deleting') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  if (status === 'error') return <X className="h-4 w-4 text-destructive" />
  return <span className="h-4 w-4 rounded-full border border-border" aria-hidden="true" />
}

function StepReview(props: {
  name: string
  description: string
  slug: string
  license: string
  tags: string[]
  tools: string[]
  sounds: Record<string, SoundState>
  onBack: () => void
  onPublish: () => void
  onDiscard: () => void
  isSubmitting: boolean
  canPublish: boolean
}) {
  const uploaded = Object.entries(props.sounds).filter(([, s]) => s.status === 'done')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review and publish</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="relative overflow-hidden rounded-lg p-5 text-white">
          <div
            className="absolute inset-0 scale-110"
            style={{ background: generateGradient(props.slug), filter: 'blur(0.3rem)' }}
            aria-hidden="true"
          />
          <div className="relative text-xs uppercase tracking-wider opacity-80">/packs/{props.slug}</div>
          <div className="relative mt-1 text-2xl font-semibold">{props.name}</div>
          {props.description ? (
            <p className="relative mt-2 text-sm opacity-90">{props.description}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">License</div>
            <div>{props.license}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Sounds</div>
            <div>
              {uploaded.length} uploaded
              {!props.canPublish ? (
                <span className="ml-2 text-xs text-destructive">
                  · missing required events
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {props.tags.length > 0
                ? props.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Tools</div>
            <div className="flex flex-wrap gap-1.5">
              {props.tools.length > 0
                ? props.tools.map((tool) => (
                    <Badge key={tool} variant="outline">
                      {tool}
                    </Badge>
                  ))
                : '—'}
            </div>
          </div>
        </div>

        <Separator />
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={props.onDiscard} className="text-destructive">
            <X />
            Delete draft
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={props.onBack}>
              <ChevronLeft />
              Back
            </Button>
            <Button onClick={props.onPublish} disabled={!props.canPublish || props.isSubmitting}>
              {props.isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Publish pack
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
