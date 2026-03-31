import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://qjvamxyspqexibdsavkc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdmFteHlzcHFleGliZHNhdmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjE3MDAsImV4cCI6MjA3Mjk5NzcwMH0.gNO-c6_A80h2j45i0dqdwqOyZ3qV0lmxUo1nzC0Qo0c'

// Create Supabase client with OAuth and deep linking configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // IMPORTANT: Set to false for mobile - we handle redirects manually
    detectSessionInUrl: false,
    // Use PKCE flow for OAuth (more secure for mobile apps)
    flowType: 'pkce',
    // Auto-refresh tokens before they expire
    autoRefreshToken: true,
    // Persist session in AsyncStorage
    persistSession: true,
    // Use AsyncStorage directly (Supabase will handle it)
    storage: AsyncStorage,
  },
  realtime: {
    // Disable for React Native to avoid ws package issues
    enabled: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
})
