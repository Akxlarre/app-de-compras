/**
 * Supabase auto-generated types.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --local > src/app/core/models/supabase.types.ts
 *
 * Requires `supabase start` to be running.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
    CompositeTypes: Record<string, unknown>;
  };
};
