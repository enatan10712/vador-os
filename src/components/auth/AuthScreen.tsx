'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { resolvePostLoginRoute } from '../../lib/auth-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  mode: AuthMode;
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const authClient = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: rememberMe,
      },
    });
  }, [rememberMe]);

  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/callback?next=/dashboard`;
  }, []);

  const rememberMeLabel = rememberMe ? 'Stay signed in on this device' : 'Use this session only';

  const resetRedirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/callback?next=/reset-password`;
  }, []);

  useEffect(() => {
    if (!authClient) {
      return;
    }

    let active = true;
    authClient.auth.getSession().then(({ data }) => {
      if (active && data.session && data.session.user) {
        router.replace(resolvePostLoginRoute(data.session.user));
      }
    });

    return () => {
      active = false;
    };
  }, [authClient, router]);

  const validateCommonFields = () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setMessage('Enter a valid email address.');
      return null;
    }

    if (mode === 'signup') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        setMessage(passwordResult.error.issues[0]?.message ?? 'Use a stronger password.');
        return null;
      }

      if (password !== confirmPassword) {
        setMessage('Passwords do not match.');
        return null;
      }
    } else if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return null;
    }

    return { email: emailResult.data, password };
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = validateCommonFields();
    if (!parsed) return;

    if (!authClient) {
      setMessage('Authentication is unavailable in this environment.');
      return;
    }

    setLoading(true);
    const result =
      mode === 'signup'
        ? await authClient.auth.signUp({
            email: parsed.email,
            password: parsed.password,
            options: { emailRedirectTo: redirectUrl },
          })
        : await authClient.auth.signInWithPassword({
            email: parsed.email,
            password: parsed.password,
          });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === 'signup') {
      setMessage(result.data.session ? 'Account created. Redirecting...' : 'Check your email to confirm your account.');
      if (result.data.session) {
        router.replace(resolvePostLoginRoute(result.data.user));
      }
      return;
    }

    const nextRoute = resolvePostLoginRoute(result.data.user);
    setMessage('Signed in successfully. Redirecting...');
    router.replace(nextRoute);
  };

  const handleMagicLink = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setMessage('Enter a valid email for the magic link.');
      return;
    }

    if (!authClient) {
      setMessage('Authentication is unavailable in this environment.');
      return;
    }

    setLoading(true);
    const { error } = await authClient.auth.signInWithOtp({
      email: emailResult.data,
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    setMessage(error ? error.message : 'Magic link sent. Check your inbox.');
  };

  const handlePasswordReset = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setMessage('Enter a valid email to receive a reset link.');
      return;
    }

    if (!authClient) {
      setMessage('Authentication is unavailable in this environment.');
      return;
    }

    setLoading(true);
    const { error } = await authClient.auth.resetPasswordForEmail(emailResult.data, {
      redirectTo: resetRedirectUrl,
    });
    setLoading(false);

    setMessage(
      error
        ? error.message
        : 'Password reset email sent. Check your inbox and follow the secure link to continue.'
    );
  };

  const handleGoogleOAuth = async () => {
    if (!authClient) {
      setMessage('Authentication is unavailable in this environment.');
      return;
    }

    setLoading(true);
    const { error } = await authClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Vador OS</p>
          <h1 className="mt-3 text-3xl font-black">{mode === 'signup' ? 'Create account' : 'Sign in'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'signup'
              ? 'Create a secure account with email/password or Google OAuth.'
              : 'Use email/password, magic link, or Google OAuth to access the restaurant cockpit.'}
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-2 block font-medium">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
            </label>

            {mode === 'signup' ? (
              <label className="block text-sm">
                <span className="mb-2 block font-medium">Confirm password</span>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </label>
            ) : null}

            {mode === 'login' ? (
              <label className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                <span>{rememberMeLabel}</span>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            ) : null}

            <div className="flex flex-col gap-3">
              <Button type="submit" loading={loading} fullWidth>
                {mode === 'signup' ? 'Create account' : 'Sign in'}
              </Button>
              <Button type="button" variant="secondary" fullWidth onClick={handleGoogleOAuth} disabled={loading}>
                Continue with Google
              </Button>
              {mode === 'login' ? (
                <>
                  <Button type="button" variant="ghost" fullWidth onClick={handleMagicLink} disabled={loading}>
                    Send magic link
                  </Button>
                  <Button type="button" variant="ghost" fullWidth onClick={handlePasswordReset} disabled={loading}>
                    Forgot password?
                  </Button>
                </>
              ) : null}
            </div>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
              {message}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            {mode === 'signup' ? (
              <a className="font-medium text-primary hover:underline" href="/login">
                Already have an account?
              </a>
            ) : (
              <a className="font-medium text-primary hover:underline" href="/signup">
                Need an account?
              </a>
            )}
            <a className="font-medium text-primary hover:underline" href="/dashboard">
              Continue as guest
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
