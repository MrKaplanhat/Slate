// Supabase client for use in Client Components (browser).
// Server Components / Route Handlers should use src/lib/supabase/server.ts instead.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
