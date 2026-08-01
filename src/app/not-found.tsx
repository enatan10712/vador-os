import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="max-w-lg rounded-3xl border border-border/70 bg-card/95 p-10 text-center shadow-2xl shadow-black/10">
        <p className="text-sm uppercase font-semibold tracking-[0.3em] text-muted-foreground">404</p>
        <h1 className="mt-4 text-3xl font-black">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">The route you are trying to access is either private, expired, or does not exist yet.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
