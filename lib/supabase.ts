import { createClient } from "@supabase/supabase-js"
import { getAnonDeviceId } from "./device-id"
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
      },
      global: {
        headers: typeof window !== "undefined" && getAnonDeviceId()
          ? { "x-anon-device-id": getAnonDeviceId() as string }
          : undefined
      }
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: typeof window !== "undefined" && getAnonDeviceId()
          ? { "x-anon-device-id": getAnonDeviceId() as string }
          : undefined
      }
    })

// Server-side client with service role key for admin operations
export const supabaseAdmin = isConfigured && supabaseServiceKey
  ? createClient(supabaseUrl!, supabaseServiceKey)
  : null