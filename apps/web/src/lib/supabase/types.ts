/**
 * Placeholder Supabase Database type. Once the schema is applied to your
 * Supabase project, regenerate this file via:
 *
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/types.ts
 *
 * Until then we keep a permissive shape so the Supabase clients remain usable.
 */

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>
    Views: Record<string, { Row: Record<string, unknown> }>
    Functions: Record<string, unknown>
    Enums: Record<string, unknown>
    CompositeTypes: Record<string, unknown>
  }
}
