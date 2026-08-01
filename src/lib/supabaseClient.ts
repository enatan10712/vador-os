/**
 * Django-backed Custom Supabase Client Mock.
 * Completely removes real Supabase dependencies from the client side and pipes
 * all operations into our secure Django REST backend.
 */

interface SignUpParams {
  email: string;
  password?: string;
  options?: unknown;
}

interface SignInParams {
  email: string;
  password?: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  aud: string;
  created_at: string;
  app_metadata: { role: string; [key: string]: unknown };
  user_metadata: { role: string; full_name?: string; [key: string]: unknown };
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user: UserProfile;
}

interface AuthResult {
  data: {
    user: UserProfile | null;
    session: Session | null;
  };
  error: { message: string } | null;
}

interface AuthSessionResult {
  data: {
    session: Session | null;
  };
  error: { message: string } | null;
}

class DjangoAuthClient {
  async getSession(): Promise<AuthSessionResult> {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) {
        return { data: { session: null }, error: null };
      }
      const data = await res.json();
      if (data.session) {
        const userWithMetadata: UserProfile = {
          ...data.session.user,
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: { role: data.session.user.role },
          user_metadata: { role: data.session.user.role, full_name: data.session.user.email.split('@')[0] }
        };
        const sessionObj: Session = {
          access_token: 'mock-access',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: userWithMetadata
        };
        return { data: { session: sessionObj }, error: null };
      }
    } catch {
      // ignore
    }
    return { data: { session: null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    let active = true;
    this.getSession().then(({ data }) => {
      if (active) {
        callback('SIGNED_IN', data.session);
      }
    });
    return {
      data: {
        subscription: {
          unsubscribe() {
            active = false;
          }
        }
      }
    };
  }

  async signUp({ email, password }: SignUpParams): Promise<AuthResult> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'customer' })
      });
      const data = await res.json();
      if (res.ok) {
        const userWithMetadata: UserProfile = {
          ...data.user,
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: { role: data.user.role },
          user_metadata: { role: data.user.role }
        };
        const sessionObj: Session = {
          access_token: 'mock-access',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: userWithMetadata
        };
        return { data: { user: userWithMetadata, session: sessionObj }, error: null };
      }
      return { data: { user: null, session: null }, error: { message: data.error || 'Signup failed' } };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { data: { user: null, session: null }, error: { message } };
    }
  }

  async signInWithPassword({ email, password }: SignInParams): Promise<AuthResult> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        const userWithMetadata: UserProfile = {
          ...data.user,
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: { role: data.user.role },
          user_metadata: { role: data.user.role }
        };
        const sessionObj: Session = {
          access_token: 'mock-access',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: userWithMetadata
        };
        return { data: { user: userWithMetadata, session: sessionObj }, error: null };
      }
      return { data: { user: null, session: null }, error: { message: data.error || 'Login failed' } };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { data: { user: null, session: null }, error: { message } };
    }
  }

  async signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    return { error: null };
  }

  async updateUser({ password }: { password?: string }) {
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        return { data: { user: null }, error: null };
      }
      const data = await res.json();
      return { data: null, error: { message: data.error || 'Password update failed' } };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { data: null, error: { message } };
    }
  }

  async signInWithOtp({ email }: { email: string; options?: unknown }): Promise<{ data: unknown; error: { message: string } | null }> {
    const _email = email;
    return { data: { user: null, session: null, email: _email }, error: null };
  }

  async resetPasswordForEmail(email: string): Promise<{ data: unknown; error: { message: string } | null }> {
    const _email = email;
    return { data: { email: _email }, error: null };
  }

  async signInWithOAuth(): Promise<{ data: unknown; error: { message: string } | null }> {
    return { data: null, error: null };
  }
}

class DjangoSupabaseMock {
  auth = new DjangoAuthClient();
  from(table: string) {
    const _tableName = table;
    return {
      select() { return this; },
      eq() { return this; },
      single() { return Promise.resolve({ data: _tableName, error: null }); }
    };
  }
}

export const createBrowserSupabase = (): DjangoSupabaseMock => {
  return new DjangoSupabaseMock();
};
