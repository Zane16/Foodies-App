import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qjvamxyspqexibdsavkc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdmFteHlzcHFleGliZHNhdmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjE3MDAsImV4cCI6MjA3Mjk5NzcwMH0.gNO-c6_A80h2j45i0dqdwqOyZ3qV0lmxUo1nzC0Qo0c'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
