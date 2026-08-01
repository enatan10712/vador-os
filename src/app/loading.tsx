export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="rounded-3xl border border-border/80 bg-card/90 p-10 text-center shadow-2xl shadow-black/10 backdrop-blur-xl">
        <div className="h-14 w-14 mx-auto mb-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl animate-spin">⏳</div>
        <h1 className="text-xl font-bold mb-2">Loading Vador OS</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Preparing your premium restaurant workspace. This should only take a moment.</p>
      </div>
    </div>
  );
}
