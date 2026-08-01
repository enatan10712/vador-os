'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="max-w-lg rounded-3xl border border-border/70 bg-card/95 p-8 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">500</p>
        <h1 className="mt-3 text-3xl font-black">Something unexpected happened</h1>
        <p className="mt-3 text-sm text-muted-foreground">A request failed while rendering this page. Retry the action or return to the operations dashboard.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
