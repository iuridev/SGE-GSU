import { createBrowserClient } from '@supabase/ssr'

// Usamos createBrowserClient para que a sessão seja salva em Cookies automaticamente
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)