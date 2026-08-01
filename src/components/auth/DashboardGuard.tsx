'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '../../lib/supabaseClient';

interface DashboardGuardProps {
  children: React.ReactNode;
}

export default function DashboardGuard({ children }: DashboardGuardProps) {
  const router = useRouter();
  // Create the client once synchronously via a ref — avoids the setState null race
  const supabaseRef = useRef(createBrowserSupabase());
  const supabase = supabaseRef.current;
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionExists = Boolean(data.session);
      setIsAuthenticated(sessionExists);
      setChecking(false);

      if (!sessionExists) {
        router.replace('/login');
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const sessionExists = Boolean(session);
      setIsAuthenticated(sessionExists);
      setChecking(false);

      if (!sessionExists) {
        router.replace('/login');
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-sm rounded-3xl border border-border bg-card px-8 py-10 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Vador OS</p>
          <h1 className="mt-3 text-2xl font-black">Checking your session</h1>
          <p className="mt-2 text-sm text-muted-foreground">We are validating access before loading the dashboard.</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
