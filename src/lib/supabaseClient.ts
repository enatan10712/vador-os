import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export const createBrowserSupabase = () => createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
