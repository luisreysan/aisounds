import { UploadWizard } from '@/components/upload-wizard'
import { requireUser } from '@/lib/auth'

export const metadata = {
  title: 'Upload pack',
}

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  await requireUser('/upload')

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Upload a pack</h1>
        <p className="text-sm text-muted-foreground">
          Three steps: set the metadata, upload your sounds, and publish. Required sounds are
          highlighted with a blue border.
        </p>
        <p className="text-xs text-muted-foreground">
          Heads up: your pack has a <strong className="text-foreground">display name</strong> (the
          title shown to users, editable any time) and a{' '}
          <strong className="text-foreground">URL slug</strong> (the unique reference used in the
          pack link — generated from the name and permanent once the draft is created).
        </p>
      </header>

      <UploadWizard />
    </main>
  )
}
