import AppShell from '../../components/AppShell';

export default function ProfilePage() {
  return (
    <AppShell title="My Profile" description="Manage your workspace preferences and account security." badge="Secure Session">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
              VP
            </div>
            <div>
              <h2 className="text-xl font-black">Restaurant Operator</h2>
              <p className="text-sm text-muted-foreground">Control your account, security posture, and team preferences.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="font-semibold text-foreground">Account snapshot</p>
              <p className="mt-1">Your profile page is now wired into the main navigation and prepared for future billing, security, and preference modules.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="font-semibold text-foreground">Session control</p>
              <p className="mt-1">You can keep this device signed in or clear the session after a shift, depending on your operational need.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl">
          <h2 className="text-lg font-black">Recommended next steps</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>• Link your profile to a real Supabase profile table.</li>
            <li>• Add avatar upload and notification preferences.</li>
            <li>• Support role-based permissions for managers and staff.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
