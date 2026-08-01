export function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';

  // Support both the standard anon key name and the publishable key alias
  // used in some Supabase SDK versions. Vercel env vars must include one of these.
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    '';

  if (!anonKey && typeof window !== 'undefined') {
    console.error(
      '[Vador OS] Supabase anon key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment variables.'
    );
  }

  return { url, anonKey };
}
