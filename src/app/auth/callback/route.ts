import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/dashboard';
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  return NextResponse.redirect(new URL(safeNext, siteUrl));
}
