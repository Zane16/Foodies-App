import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zyphihcaugwldymwvinr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cGhpaGNhdWd3bGR5bXd2aW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTA5MzMsImV4cCI6MjA3Mjg4NjkzM30.PecT9c17ZD_nmv0-bUhlBBrLJLQ--nHgaBJtznuHJWI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
