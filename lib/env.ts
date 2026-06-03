// Environment variable validation utility

export function validateSupabaseEnv() {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  }

  const missing = Object.entries(requiredVars)
    .filter(([, value]) => !value || value.includes('placeholder'))
    .map(([key]) => key)

  if (missing.length > 0) {
    console.warn(`Missing or invalid environment variables: ${missing.join(', ')}`)
    return false
  }

  return true
}

export function isSupabaseConfigured() {
  return validateSupabaseEnv()
}