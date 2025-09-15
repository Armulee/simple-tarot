import { createClient } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "./env"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate environment variables
const isConfigured = isSupabaseConfigured()

// Create Supabase client with fallback for build time
export const supabase = isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })

// Server-side client with service role key for admin operations
export const supabaseAdmin = isConfigured && supabaseServiceKey
  ? createClient(supabaseUrl!, supabaseServiceKey)
  : null