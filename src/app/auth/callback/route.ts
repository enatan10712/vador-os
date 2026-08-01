import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseConfig } from '../../../lib/supabaseConfig';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  // Determine the correct origin — prefer NEXT_PUBLIC_SITE_URL on Vercel
  // to avoid redirect mismatches when Supabase sends back to a preview URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_callback', siteUrl));
  }

  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = await cookies();
  const redirectResponse = NextResponse.redirect(new URL(safeNext, siteUrl));

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(
      new URL(`/login?error=auth_callback&reason=${encodeURIComponent(error.message)}`, siteUrl)
    );
  }

  return redirectResponse;
}
