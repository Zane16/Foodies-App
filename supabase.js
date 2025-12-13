import { createClient } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { Platform } from 'react-native'

const SUPABASE_URL = 'https://qjvamxyspqexibdsavkc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdmFteHlzcHFleGliZHNhdmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjE3MDAsImV4cCI6MjA3Mjk5NzcwMH0.gNO-c6_A80h2j45i0dqdwqOyZ3qV0lmxUo1nzC0Qo0c'

// Create Supabase client with OAuth and deep linking configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Enable session detection from URL (for OAuth and magic link callbacks)
    detectSessionInUrl: true,
    // Use PKCE flow for OAuth (more secure for mobile apps)
    flowType: 'pkce',
    // Configure redirect URL for OAuth and magic links
    // This creates a deep link like: foodies://auth/callback
    redirectTo: Platform.OS === 'web'
      ? `${window.location.origin}/auth/callback`
      : Linking.createURL('auth/callback'),
    // Auto-refresh tokens before they expire
    autoRefreshToken: true,
    // Persist session in AsyncStorage
    persistSession: true,
    // Detect session in URL after OAuth redirect
    storage: undefined, // Use default AsyncStorage
  },
})
