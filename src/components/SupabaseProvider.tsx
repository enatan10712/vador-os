'use client';

import React from 'react';

// SupabaseProvider wraps the app for future context needs.
// Each component creates its own browser client via createBrowserSupabase()
// using lazy initialization to ensure env vars are read client-side.
export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
