'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing authentication...');

  const nextPath = useMemo(() => searchParams.get('next') ?? '/dashboard', [searchParams]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      if (data.session) {
        router.replace(nextPath);
        return;
      }

      setStatus('No active session was found. Redirecting to sign in.');
      router.replace('/login');
    });

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="rounded-3xl border border-border bg-card px-8 py-10 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Vador OS</p>
        <h1 className="mt-3 text-2xl font-black">Authentication callback</h1>
        <p className="mt-2 text-sm text-muted-foreground">{status}</p>
      </div>
    </main>
  );
}
