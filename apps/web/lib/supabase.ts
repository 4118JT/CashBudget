import { createClient } from '@supabase/supabase-js';

// Use placeholder values during build-time pre-rendering; real values come from env at runtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

export const supabase = createClient(url, anon);
