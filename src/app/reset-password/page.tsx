'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Verifying your password reset link...');
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      if (data.session) {
        setHasRecoverySession(true);
        setMessage('Enter a new secure password to finish the reset.');
        return;
      }

      setHasRecoverySession(false);
      setMessage('This reset link is missing or expired. Please request a new one.');
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!hasRecoverySession) {
      setMessage('A valid password reset session is required before changing your password.');
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setMessage(passwordResult.error.issues[0]?.message ?? 'Use a stronger password.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    setMessage('Password updated successfully. Redirecting to sign in...');
    router.replace('/login');
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Vendor OS</p>
          <h1 className="mt-3 text-3xl font-black">Reset password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong new password to secure your account and continue back into the dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-2 block font-medium">New password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium">Confirm new password</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>

            <Button type="submit" loading={loading} fullWidth disabled={!hasRecoverySession}>
              Update password
            </Button>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
              {message}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <a className="font-medium text-primary hover:underline" href="/login">
              Back to sign in
            </a>
            <a className="font-medium text-primary hover:underline" href="/signup">
              Create account
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
