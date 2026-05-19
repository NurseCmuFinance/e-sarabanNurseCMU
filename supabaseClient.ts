import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// ✅ ตั้งค่าเชื่อมต่อเรียบร้อยแล้ว
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://repmnbeqkicibvqzonds.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcG1uYmVxa2ljaWJ2cXpvbmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODMyODIsImV4cCI6MjA4Mjk1OTI4Mn0.CWsfJ8eL7Tj2YF8UFDLfLwOwu8-evJqdlAMagzFep8Y';

let client: SupabaseClient | null = null;

try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}

export const supabase = client;