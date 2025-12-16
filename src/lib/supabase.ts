"use client";

import { createBrowserClient } from '@supabase/ssr'

// NOTE: The separate create server client is in `src/lib/supabase-server.ts`
// Always use the function from there in Server Components and Route Handlers
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
