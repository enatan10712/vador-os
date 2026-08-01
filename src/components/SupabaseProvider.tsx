'use client';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';
import React, { useMemo } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  useMemo(() => createClient<Database>(supabaseUrl, supabaseAnonKey), []);

  return <>{children}</>;
}
